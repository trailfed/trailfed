---
title: Federation Protocol (ActivityPub Extensions)
version: 0.1
status: draft
updated: 2026-04-22
---

# 06. Федеративный протокол

## Основа: W3C ActivityPub

TrailFed использует [ActivityPub](https://www.w3.org/TR/activitypub/) как базовый протокол. Мы **не изобретаем собственный протокол** — мы реализуем W3C стандарт и минимально его расширяем.

Это означает частичную совместимость с:
- Mastodon, Pleroma/Akkoma, GoToSocial, Pixelfed для actors, follows, notes и базовой federation
- Mobilizon, Friendica, Hubzilla
- places.pub (Social Web Foundation) как read-only AS2 Place reference
- Будущими geo-aware ActivityPub имплементациями

Важно: Mastodon не становится полноценным POI client. Он first-class обрабатывает `Note`/`Question`; `Place`, `Arrive`, `Leave`, `Travel` могут проходить как generic objects/best-effort или игнорироваться. Полная POI/check-in federation требует TrailFed-compatible peer.

## Используемые AS Vocabulary types (без изменений)

Из [Activity Streams 2.0 Vocabulary](https://www.w3.org/TR/activitystreams-vocabulary/):

### Objects
- **`Person`** (Actor) — пользователь
- **`Place`** — POI (кемпинг, заправка, dump station, ...)
- **`Note`** — социальный пост
- **`Image`** — фото (attached к POI или Note)
- **`Document`** — GPX файл трека

### Activities
- **`Create`** — создать POI, написать пост
- **`Update`** — обновить POI
- **`Delete`** — soft-delete
- **`Follow`** — подписка на user
- **`Like`** — лайк
- **`Announce`** — reshare (boost)
- **`Arrive`** — check-in в POI (W3C определён!)
- **`Leave`** — check-out из POI (W3C определён!)
- **`Travel`** — в пути (маршрут между two Places)

**Ключевой момент:** `Arrive`, `Leave`, `Travel` — стандартные W3C активности. Мы их используем как-есть, не изобретаем свои аналоги.

## Namespace расширений TrailFed

Namespace: `https://trailfed.org/ns/v1`

Расширения минимальны — только там, где AS Vocabulary не покрывает travel-specific нужды.

### Extension 1: `QualityTier`

Property на `Place`:

```json
{
  "@context": ["https://www.w3.org/ns/activitystreams", "https://trailfed.org/ns/v1"],
  "type": "Place",
  "trailfed:qualityTier": 2
}
```

Values:
- `0` — unverified (auto-import OSM)
- `1` — community-reported (1+ user check-in)
- `2` — verified (moderator или 3+ independent check-ins)
- `3` — partner-verified (tourism board, SLA data)

### Extension 2: `AmenityBundle`

Property на `Place`:

```json
{
  "trailfed:amenities": {
    "drinking_water": true,
    "electricity": false,
    "showers": true,
    "toilets": true,
    "dump_station": false,
    "wifi": false,
    "pets_allowed": true,
    "van_accessible": true,
    "height_limit_m": 3.2
  },
  "trailfed:access": {
    "fee": "yes",
    "price_eur": 18.00,
    "booking_required": false,
    "opening_months": [4,5,6,7,8,9,10],
    "opening_hours": "08:00-22:00"
  }
}
```

### Extension 3: `TravelTrack` (extends `Travel`)

Для публикации GPX треков:

```json
{
  "type": ["Travel", "trailfed:TravelTrack"],
  "actor": "https://instance.com/actors/alice",
  "origin": "https://instance.com/places/start-uuid",
  "target": "https://instance.com/places/end-uuid",
  "trailfed:polyline": "gfo}FhqhkVa@hDaHzM...",
  "trailfed:distance_km": 124.5,
  "trailfed:duration_minutes": 180,
  "trailfed:track_type": "road",
  "startTime": "2026-04-22T08:00:00Z",
  "endTime": "2026-04-22T11:00:00Z"
}
```

### Extension 4: `LiveBroadcast` (NOT federated — WebSocket only)

**Критически важно:** live location **не является** federated activity. Это ephemeral WebSocket signal. Мы вводим тип только для documentation purposes — чтобы было ясно что это особый case.

## GeoSocial compatibility profile

TrailFed peers advertise supported geo capabilities in NodeInfo. Это снижает protocol fragmentation и позволяет Mastodon-compatible social federation жить отдельно от POI federation.

### Capabilities

```json
{
  "metadata": {
    "trailfed": {
      "schema_version": "1.0",
      "places": true,
      "place_reviews": true,
      "checkins": true,
      "travel_tracks": true,
      "live_location": false,
      "imports": ["osm", "places.pub"],
      "licenses": ["ODbL-1.0", "CC-BY-4.0"]
    }
  }
}
```

### `Place` MUST fields

- `id`
- `type: "Place"` или `["Place", "geojson:Feature"]`
- `name` или `nameMap`
- `latitude` и `longitude`, либо `geojson:hasGeometry`
- source/license metadata: `dcterms:source`, `dcterms:license`, or `trailfed:source`

### `Place` SHOULD fields

- `summary`
- `tag` или `trailfed:category`
- `trailfed:amenities`
- `trailfed:qualityTier`
- `trailfed:sourceConfidence`
- `attributedTo`

## Actor discovery и identity

### WebFinger (RFC 7033)

```
GET /.well-known/webfinger?resource=acct:alice@trailfed.example.com

Response:
{
  "subject": "acct:alice@trailfed.example.com",
  "aliases": ["https://trailfed.example.com/actors/alice"],
  "links": [
    {
      "rel": "self",
      "type": "application/activity+json",
      "href": "https://trailfed.example.com/actors/alice"
    }
  ]
}
```

### Actor object

```json
{
  "@context": [
    "https://www.w3.org/ns/activitystreams",
    "https://w3id.org/security/v1",
    "https://trailfed.org/ns/v1"
  ],
  "type": "Person",
  "id": "https://trailfed.example.com/actors/alice",
  "preferredUsername": "alice",
  "inbox": "https://trailfed.example.com/actors/alice/inbox",
  "outbox": "https://trailfed.example.com/actors/alice/outbox",
  "followers": "https://trailfed.example.com/actors/alice/followers",
  "following": "https://trailfed.example.com/actors/alice/following",
  "publicKey": {
    "id": "https://trailfed.example.com/actors/alice#main-key",
    "owner": "https://trailfed.example.com/actors/alice",
    "publicKeyPem": "-----BEGIN PUBLIC KEY-----\n..."
  },
  "trailfed:vehicle": "motorhome",
  "trailfed:shareLocation": false
}
```

### NodeInfo (instance metadata)

```
GET /.well-known/nodeinfo

Response:
{
  "links": [
    {
      "rel": "http://nodeinfo.diaspora.software/ns/schema/2.1",
      "href": "https://trailfed.example.com/nodeinfo/2.1"
    }
  ]
}

GET /nodeinfo/2.1
{
  "version": "2.1",
  "software": {
    "name": "trailfed",
    "version": "0.1.0",
    "repository": "https://github.com/trailfed/core"
  },
  "protocols": ["activitypub"],
  "usage": {
    "users": {"total": 42, "activeMonth": 30}
  },
  "openRegistrations": true,
  "metadata": {
    "trailfed": {
      "federates_places": true,
      "federates_checkins": true,
      "federates_location": false,
      "schema_version": "1.0"
    }
  }
}
```

## Authentication: HTTP Signatures

Interop reality: Fediverse S2S compatibility сегодня требует legacy Cavage-style HTTP Signatures (`Signature` header), потому что Mastodon/GoToSocial/Pleroma/Akkoma в основном используют этот профиль. [RFC 9421 HTTP Message Signatures](https://www.rfc-editor.org/rfc/rfc9421.html) — актуальный IETF Proposed Standard, но пока не является baseline для Fediverse interop.

TrailFed должен:
1. **MUST support:** legacy `Signature` header compatible with Mastodon/GoToSocial.
2. **SHOULD support:** RFC 9421 `Signature-Input`/`Signature` для future peers.
3. **MUST sign:** POST inbox deliveries.
4. **SHOULD sign:** GET requests к ActivityPub resources для secure/authorized fetch peers.

Каждый S2S POST на `/inbox` подписан:

```
POST /actors/alice/inbox HTTP/1.1
Host: trailfed.example.com
Date: Wed, 22 Apr 2026 12:00:00 GMT
Digest: SHA-256=X48E9qOokqqrvdts8nOJRJN3OWDUoyWxBf7kbu9DBPE=
Content-Type: application/activity+json
Signature: keyId="https://other-instance.com/actors/bob#main-key",
           algorithm="rsa-sha256",
           headers="(request-target) host date digest",
           signature="qdx+H7PHHDZg..."

{...JSON-LD Activity...}
```

Верификация:
1. Fetch `keyId` публичный ключ
2. Reconstruct signing string
3. Verify signature
4. Check `Date` в пределах ±30 секунд
5. Check `Digest` matches body

## Trust model

Каждый instance имеет таблицу `peers` с trust levels:

### `trusted` — Белый список
- Activities применяются автоматически
- Place creates не идут в moderation queue
- Обычно: друзья-instances, проверенные partners

### `graylist` — Серый список (дефолт)
- Activities идут в moderation queue
- Admin одобряет вручную для первых N activities
- После N успешных без flags → авто-apply может быть включено

### `blocklist` — Чёрный список
- Все activities dropped
- Outgoing activities к этому peer НЕ отправляются
- Аналог Mastodon defederation

### Reputation score
Локальный (не federated) score per peer:
- `+1` за each valid activity применённую
- `-5` за flagged content от этого peer
- `-20` за spam patterns (много creates быстро)
- Админ может вручную корректировать

## Conflict resolution

### Geospatial fingerprint для dedup

Когда приходит `Create{Place}`, проверяем на duplicate:

```
candidate_score =
    distance_score(lat/lng radius) +
    category_score(mapped_category) +
    normalized_name_score +
    osm_id_exact_match +
    source_confidence +
    address_phone_website_similarity
```

Простой hash `round(lat,4)+name+category` допустим только как быстрый prefilter, но не как единственный dedup mechanism.

Если candidate score выше threshold:
- Same origin instance → treated as Update
- Different origin → propose Merge activity to admin moderation queue

### Merge activity

```json
{
  "type": "trailfed:Merge",
  "actor": "...",
  "object": "https://instance-a.com/places/foo",   -- source (will be marked as alias)
  "target": "https://instance-b.com/places/bar"    -- canonical
}
```

Каждый instance **сам решает** применять Merge или нет. Может быть применён:
- Автоматически если source был from trusted peer
- После admin review otherwise

После применения: `places.canonical_uri` ссылается на target, запросы к `uri` редиректят.

## Live location — почему НЕ federated

Live location (real-time GPS stream) **не федерируется через ActivityPub**. Причины:

1. **Privacy** — federation = sending data to N peers. Для live location это magnitude больше surface area для утечек.
2. **Performance** — ActivityPub eventual consistency не подходит для real-time (latency может быть минуты).
3. **Scope** — live location — session data, не historical record.

Вместо этого:
- Live location broadcast ТОЛЬКО через WebSocket (Centrifugo) на same instance
- No public geohash channels in MVP
- Delivery только explicit allowlist, не "all followers"
- Для federated "locations nearby" — opt-in **snapshot** periodical publish как `Travel` activity (every 30 мин, с CITY или COUNTRY precision)
- Snapshot — это persistent record, не stream

## places.pub интеграция

[places.pub](https://places.pub/) — AS2/ActivityPub-compatible wrapper над OSM Places. Они публикуют Place objects для OSM POIs с URL формата `https://places.pub/{node|way|relation}/{id}`.

Наша интеграция:
- TrailFed fetches `https://places.pub/{osm_type}/{osm_id}` для получения Place object
- Сохраняем как external Place reference
- Cross-reference через `trailfed:osm_id`

Не "федерируемся" в полном смысле — places.pub read-only, objects не Actors, у них нет inbox/outbox. Мы не шлём им activities; мы консумим их данные как canonical AS2 Place references.

## Пример полной federation flow

**Scenario:** Alice на instance-a создаёт POI "Playa del Sol campsite".

1. Alice → `POST /api/v1/places` (REST, локальное API)
2. Instance-a создаёт Place object, Activity{Create, object: Place}
3. Instance-a fans out:
   - Для каждого follower Alice на других instances:
     - Build signed HTTP POST to их inbox
     - Payload: JSON-LD Activity
   - Для `places.pub` (если настроено) — только log, не push
4. Instance-b получает POST `/actors/bob/inbox`
5. Verify signature, parse Activity
6. Fingerprint check — new POI, no dup
7. Insert Place locally (if trusted peer or pass moderation)
8. Notify Bob через WebSocket "place:new_in_area"
9. Instance-a gets 202 Accepted

Total latency: < 5 секунд для 10 subscribers.

---

## Fact-check questions для агентов

1. **W3C AS Vocabulary** — подтвердить что `Arrive`, `Leave`, `Travel` определены в standard (проверить https://www.w3.org/TR/activitystreams-vocabulary/)
2. **RFC 9421 vs legacy Cavage** — подтвердить exact compatibility expectations для Mastodon/GoToSocial/Pleroma/Akkoma.
3. **WebFinger RFC 7033** — корректный номер?
4. **NodeInfo schema** — 2.1 актуальная версия?
5. **places.pub API** — какая их реальная схема endpoints (проверить их repo)?
6. **JSON-LD @context** — правильно ли extend через custom namespace?
7. **Mastodon compatibility** — какие `Place`/`Arrive` payloads Mastodon принимает best-effort, а какие игнорирует?
8. **HTTP Signatures digest** — SHA-256 обязательно или SHA-512 допустим?
9. **Geohash5 precision** — на самом деле ~4.9 km × 4.9 km?
10. **bridgy.fed** — есть ли этот проект для ActivityPub↔ATProto bridge?
