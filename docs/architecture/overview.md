---
title: Архитектура TrailFed
version: 0.1
status: draft
updated: 2026-04-22
---

# 05. Детальная архитектура

## Высокоуровневая схема

```
                  ┌────────────────────────────────────┐
                  │       End user (browser/PWA)       │
                  └────────────────────────────────────┘
                                   │
                       HTTP/HTTPS │ WSS
                                   ▼
         ┌──────────────────────────────────────────────┐
         │                Reverse proxy                  │
         │                 (Caddy/nginx)                  │
         └──────────────────────────────────────────────┘
                    │                │                │
                    ▼                ▼                ▼
         ┌──────────────┐  ┌──────────────┐  ┌────────────┐
         │ TrailFed Core │  │  Centrifugo  │  │   Tiles    │
         │  (Go binary) │  │   (WebSocket │  │ (Protomaps │
         │              │  │     server)  │  │  PMTiles)  │
         └──────────────┘  └──────────────┘  └────────────┘
                    │                │
                    ▼                │
         ┌──────────────────────────────┐
         │  PostgreSQL + PostGIS        │
         └──────────────────────────────┘
                    │
                    ▼
         ┌──────────────────────────────┐
         │       Other instances        │
         │   (federation via ActivityPub)│
         └──────────────────────────────┘
```

## Компоненты и их ответственности

### TrailFed Core (monolith)
- HTTP REST API
- ActivityPub inbox/outbox/WebFinger
- Mastodon-API compatibility layer (optional; not required for POI MVP)
- Authentication (OAuth2 + HTTP Signatures для S2S)
- Database access (через sqlx или GORM)
- Фоновые задачи (implementation depends on backend ADR)
- OSM import pipeline

Backend language/framework фиксируется через ADR после spike: Go/go-fed или TypeScript/Fedify. Архитектура ниже не зависит принципиально от языка.

### Centrifugo
- WebSocket connections от клиентов
- Pub/sub channels для real-time событий
- Connection token verification через TrailFed Core
- Channels (Phase 4+, не MVP):
  - `user:<actor_id>` — private: статус подписчиков, DM
  - `place:<place_id>:live` — кто сейчас check-in в этом POI, если instance включил feature
- Не используем public `location:<geohash>` channels в MVP. Даже coarse geohash может раскрывать опасную информацию в rural areas.

### PostgreSQL + PostGIS
- Все persistent данные
- Геопространственные индексы (GIST)
- Full-text search (если Meilisearch не используется)

### Redis (optional, для кеша)
- Сессии (если не JWT)
- Rate limiting (фиксированные окна)
- Временные данные live location (TTL 5 мин)

### Protomaps PMTiles (static file)
- Размещается на S3-compatible storage или локально
- MapLibre GL JS читает через HTTP range requests
- Обновляется daily/monthly depending source; default self-host setup использует regional extract или reduced maxzoom, потому что full planet basemap z0-z15 около 120 GB

## Схема базы данных (ключевые таблицы)

```sql
-- Actors (локальные и remote через federation)
CREATE TABLE actors (
    id BIGSERIAL PRIMARY KEY,
    uri TEXT UNIQUE NOT NULL,            -- https://instance.com/actors/alice
    username VARCHAR(64) NOT NULL,
    domain VARCHAR(255) NOT NULL,
    display_name VARCHAR(200),
    bio TEXT,
    avatar_url TEXT,
    public_key TEXT,                     -- RSA or ed25519 for HTTP Signatures
    private_key TEXT,                    -- only for local actors
    is_local BOOLEAN DEFAULT false,
    followers_url TEXT,
    following_url TEXT,
    inbox_url TEXT,
    outbox_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    UNIQUE(username, domain)
);

-- Places (POI как ActivityPub objects)
CREATE TABLE places (
    id BIGSERIAL PRIMARY KEY,
    uri TEXT UNIQUE NOT NULL,            -- https://instance.com/places/uuid
    local_uuid UUID UNIQUE NOT NULL,
    origin_actor_id BIGINT REFERENCES actors(id),

    category VARCHAR(50) NOT NULL,       -- campsite, fuel, dump_station, ...
    names JSONB NOT NULL,                -- {"en": "Name", "ru": "..."}
    geom GEOGRAPHY(POINT, 4326) NOT NULL,

    amenities JSONB,                     -- {drinking_water, electricity, ...}
    access_info JSONB,                   -- {fee, opening_hours, ...}
    quality_tier SMALLINT DEFAULT 0,     -- 0-3
    reviews_count INT DEFAULT 0,
    reviews_avg NUMERIC(3,2),

    osm_id BIGINT,                       -- backlink to OSM if imported
    osm_type VARCHAR(10),
    osm_tags JSONB,

    source_type VARCHAR(30) DEFAULT 'user',  -- osm, user, partner, remote_instance, imported_legacy
    source_license VARCHAR(50),              -- ODbL-1.0, CC-BY-4.0, proprietary-import-denied, ...
    source_confidence SMALLINT DEFAULT 0,     -- 0-100
    attribution TEXT,

    origin_instance VARCHAR(255),
    signatures JSONB,                    -- federation signatures array

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);
CREATE INDEX places_geom_idx ON places USING GIST(geom);
CREATE INDEX places_category_idx ON places(category) WHERE is_active;
CREATE INDEX places_osm_id_idx ON places(osm_id) WHERE osm_id IS NOT NULL;

-- Field-level provenance keeps OSM-derived data, user reviews, and partner data legally separable.
CREATE TABLE place_sources (
    id BIGSERIAL PRIMARY KEY,
    place_id BIGINT REFERENCES places(id),
    source_type VARCHAR(30) NOT NULL,
    source_uri TEXT,
    license VARCHAR(50),
    attribution TEXT,
    fields JSONB NOT NULL,                   -- {"names.en": "osm", "amenities.water": "user"}
    imported_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX place_sources_place_idx ON place_sources(place_id);

-- Activities (полная история для federation)
CREATE TABLE activities (
    id BIGSERIAL PRIMARY KEY,
    uri TEXT UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL,           -- Create, Update, Arrive, Leave, Travel, Like, Follow
    actor_id BIGINT REFERENCES actors(id),
    object_uri TEXT,                     -- URI of target object
    object_type VARCHAR(50),             -- Place, Note, Actor
    target_uri TEXT,                     -- для Announce, Move
    data JSONB NOT NULL,                 -- full JSON-LD activity
    published_at TIMESTAMPTZ NOT NULL,
    signature TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX activities_actor_type_idx ON activities(actor_id, type);

-- Notes (соц посты)
CREATE TABLE notes (
    id BIGSERIAL PRIMARY KEY,
    uri TEXT UNIQUE NOT NULL,
    actor_id BIGINT REFERENCES actors(id),
    content TEXT,
    content_warning TEXT,
    language VARCHAR(5),
    in_reply_to_id BIGINT REFERENCES notes(id),
    location GEOGRAPHY(POINT, 4326),     -- optional geo-tag
    place_id BIGINT REFERENCES places(id),  -- if post is about POI
    visibility VARCHAR(20),              -- public, unlisted, followers, direct
    published_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX notes_actor_idx ON notes(actor_id);
CREATE INDEX notes_place_idx ON notes(place_id) WHERE place_id IS NOT NULL;
CREATE INDEX notes_location_idx ON notes USING GIST(location) WHERE location IS NOT NULL;

-- Check-ins
CREATE TABLE checkins (
    id BIGSERIAL PRIMARY KEY,
    actor_id BIGINT REFERENCES actors(id),
    place_id BIGINT REFERENCES places(id),
    activity_id BIGINT REFERENCES activities(id),
    arrived_at TIMESTAMPTZ NOT NULL,
    left_at TIMESTAMPTZ,
    note_id BIGINT REFERENCES notes(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX checkins_place_idx ON checkins(place_id, arrived_at DESC);

-- Follows
CREATE TABLE follows (
    id BIGSERIAL PRIMARY KEY,
    actor_id BIGINT REFERENCES actors(id),
    target_actor_id BIGINT REFERENCES actors(id),
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(actor_id, target_actor_id)
);

-- Federation peers
CREATE TABLE peers (
    id BIGSERIAL PRIMARY KEY,
    domain VARCHAR(255) UNIQUE NOT NULL,
    software_name VARCHAR(100),          -- TrailFed, Mastodon, GoToSocial, ...
    software_version VARCHAR(100),
    inbox_url TEXT,
    public_key TEXT,
    trust_level VARCHAR(20) DEFAULT 'graylist',   -- trusted, graylist, blocklist
    reputation_score INT DEFAULT 0,
    last_fetched_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Live locations (could be in Redis instead, depends on scale)
CREATE TABLE live_locations (
    actor_id BIGINT PRIMARY KEY REFERENCES actors(id),
    geom GEOGRAPHY(POINT, 4326) NOT NULL,
    precision_tier VARCHAR(20) NOT NULL,  -- EXACT, CITY, COUNTRY
    accuracy_m INT,
    expires_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX live_locations_geom_idx ON live_locations USING GIST(geom);
```

## API endpoints

### REST API для клиентов

```
GET    /api/v1/places                    — bbox query
GET    /api/v1/places/{id}
POST   /api/v1/places                    — create POI
PATCH  /api/v1/places/{id}
POST   /api/v1/places/{id}/checkin
GET    /api/v1/places/{id}/checkins      — recent check-ins
GET    /api/v1/places/{id}/reviews
POST   /api/v1/places/{id}/reviews

GET    /api/v1/timelines/home            — Mastodon-API compat
GET    /api/v1/timelines/public
GET    /api/v1/timelines/location        — новое: геофенсед
POST   /api/v1/statuses
GET    /api/v1/accounts/{id}
GET    /api/v1/accounts/verify_credentials

POST   /api/v1/live/location             — opt-in update
GET    /api/v1/live/nearby               — privacy-filtered nearby users

GET    /api/v1/places/export             — GeoJSON/CSV/GPX
GET    /api/v1/places/changelog          — sync endpoint
```

### ActivityPub S2S

```
GET    /.well-known/webfinger?resource=acct:alice@instance.com
GET    /.well-known/nodeinfo
GET    /.well-known/host-meta

GET    /actors/{username}                — actor object
GET    /actors/{username}/inbox
POST   /actors/{username}/inbox
GET    /actors/{username}/outbox
GET    /actors/{username}/followers
GET    /actors/{username}/following
```

### WebSocket (Centrifugo)

```
WSS    /live/connection/websocket
       subscribe: user:123 (private)
       subscribe: location:abcd5 (public geohash cell)
       subscribe: place:456:live
```

## Data flows

### 1. POI create → federation

```
User (browser) → POST /api/v1/places
  → TrailFed Core validates
  → INSERT INTO places (local)
  → create Activity{type: Create, object: Place}
  → INSERT INTO activities
  → enqueue federation.DeliverJob
  → goroutine pool:
    → для каждого follower peer:
      → POST peer.inbox_url with signed Activity
  → return 201 Created to user
```

### 2. Check-in → followers timeline

```
User → POST /api/v1/places/{id}/checkin
  → validate user, place exists
  → INSERT INTO checkins
  → create Activity{type: Arrive, actor: user, object: Place}
  → optional: create Note with check-in context
  → federation delivery (same as #1)
  → Centrifugo.publish("user:{follower_id}", event)
    → real-time update в followers' timelines
```

### 3. Live location broadcast (Phase 4+, not MVP)

```
User's phone (PWA) → WSS publish to "user:{user_id}"
  → Centrifugo routes
  → server-side verify: did user opt-in? precision tier OK?
  → UPSERT INTO live_locations
  → fan-out только в explicit allowlist:
    → selected trusted followers get allowed precision
    → no public geohash channel
  → audit log append
```

### 4. OSM import pipeline

```
Cron: daily or weekly
  → SyncOsmJob.Run():
    → for each country/region in config:
      → для initial seed: download Geofabrik/PBF extract and filter with osmium/osm2pgsql
      → для small delta/search: Overpass API with fair-use limits
      → for each POI:
        → UPSERT INTO places (match by osm_id)
        → create Activity{type: Update} if changed
        → federate update to peers
  → log metrics (imported, updated, skipped)
```

### 5. Federation inbox processing

```
Other instance → POST /actors/alice/inbox (signed)
  → verify HTTP Signature
  → parse JSON-LD Activity
  → validate:
    → peer trust level (trusted/graylist/blocklist)
    → object schema (AS Vocabulary)
    → duplicate detection (by URI)
  → route by type:
    → Create{Place}: validate geo, insert if trusted or queue for moderation
    → Create{Note}: insert, notify local followers
    → Arrive/Leave: create check-in record, update place popularity
    → Follow: acknowledge, send Accept
    → Announce: bump visibility in local timeline
  → return 202 Accepted
```

## Deployment (docker-compose)

```yaml
services:
  trailfed:
    image: trailfed/core:v0.1.0
    environment:
      DOMAIN: ${DOMAIN}
      DB_URL: postgres://trailfed:${DB_PASS}@pg:5432/trailfed?sslmode=disable
      REDIS_URL: redis://redis:6379
      CENTRIFUGO_URL: http://centrifugo:8000
      CENTRIFUGO_HMAC_SECRET: ${CENTRIFUGO_HMAC_SECRET}
      OAUTH_ISSUER: ${DOMAIN}
    depends_on: [pg, redis, centrifugo]
    ports: ["8080:8080"]
    restart: always
    volumes:
      - ./data/media:/data/media

  pg:
    image: postgis/postgis:16-3.4
    environment:
      POSTGRES_USER: trailfed
      POSTGRES_PASSWORD: ${DB_PASS}
      POSTGRES_DB: trailfed
    volumes:
      - pgdata:/var/lib/postgresql/data
    restart: always

  redis:
    image: redis:7-alpine
    restart: always

  centrifugo:
    image: centrifugo/centrifugo:v6
    command: centrifugo
    environment:
      CENTRIFUGO_HMAC_SECRET_KEY: ${CENTRIFUGO_HMAC_SECRET}
      CENTRIFUGO_API_KEY: ${CENTRIFUGO_API_KEY}
    ports: ["8000:8000"]
    restart: always

  tiles:
    image: protomaps/go-pmtiles:latest
    command: serve /tiles
    volumes:
      - ./tiles/planet.pmtiles:/tiles/planet.pmtiles:ro
    ports: ["8081:8080"]
    restart: always

  caddy:
    image: caddy:2
    ports: ["80:80", "443:443"]
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
    depends_on: [trailfed, centrifugo, tiles]
    restart: always

volumes:
  pgdata:
  caddy_data:
```

## Масштабирование

Для 100 users — single-node выше достаточно.

Для 10k users:
- PostgreSQL master + read replica
- Centrifugo cluster (3 nodes с Redis для shared state)
- CDN перед Protomaps tiles
- Horizontal scaling TrailFed Core (stateless если не храним сессии локально)

---

## Fact-check questions для агентов

1. PostgreSQL схема — корректны ли типы? Индексы GIST правильные для geography(POINT)?
2. ActivityPub URI format `https://instance.com/places/{uuid}` — конвенциональная ли структура?
3. Схема `activities` таблицы — стандартный паттерн для ActivityPub implementations?
4. `live_locations` лучше в Redis или Postgres? (мы предполагаем опционально)
5. Centrifugo token-based auth — достаточно ли безопасно?
6. Geohash5 для geofence channels — правильный ли уровень (5 символов ~4.9km)?
7. HTTP Signatures verification — go-fed/Fedify/httpsig: какая библиотека реально совместима с Mastodon/GoToSocial legacy signatures?
8. Реверс-прокси Caddy — правильный выбор для TLS auto? Или nginx лучше?
9. Docker image size для TrailFed Go binary — ожидаемо ~30-50 MB?
10. PMTiles файл для whole world — подтвердить актуальный размер full planet (~120 GB z0-z15) и типичные размеры regional extracts.
11. Нужна ли отдельная `place_sources` таблица или достаточно field-level provenance JSONB в `places`?
12. Достаточно ли отказа от public geohash channels для MVP threat model?
