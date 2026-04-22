---
title: Технологический стек
version: 0.1
status: draft
updated: 2026-04-22
---

# 04. Выбор технологий и обоснование

## Обзор финального стека

| Слой | Технология | Лицензия | Почему |
|---|---|---|---|
| Backend | **Go 1.22+** или **TypeScript/Fedify** | BSD / MIT | Go даёт single binary; Fedify может ускорить ActivityPub MVP |
| ActivityPub | **ADR pending: go-fed/activity vs Fedify** | BSD / MIT | go-fed mature but low-activity; Fedify active and feature-rich |
| Database | **PostgreSQL 16 + PostGIS 3.4** | PostgreSQL + GPL | Стандарт геоданных, mature |
| Real-time | **Centrifugo v6** | Apache 2.0 | Standalone WebSocket Go server; optional until live features |
| Map tiles | **Protomaps PMTiles regional extracts** | BSD-3 / ODbL data | Single-file vector tiles, no API keys; full planet is large |
| Map rendering | **MapLibre GL JS + pmtiles plugin** | BSD-3 | Open fork of Mapbox, vector tiles support |
| Geocoding | **Nominatim** (optional) | AGPL-3 | Self-hostable OSM geocoding |
| Search | **Meilisearch** (optional) | MIT | Simple self-host full-text |
| Frontend | **SvelteKit** | MIT | SSR + SPA, light bundle, map-friendly |
| Containerization | **Docker Compose** | Apache 2.0 | Standard turnkey deployment |

## Backend decision: Go vs TypeScript/Fedify

**Current recommendation:** не фиксировать Go окончательно до ADR-001. Для Phase 0 нужно сделать spike:

1. Minimal `Actor` + WebFinger + signed inbox/outbox на Go/go-fed.
2. То же на TypeScript/Fedify.
3. Сравнить effort, compatibility, maintenance risk, Docker footprint и developer velocity.

Go остаётся сильным кандидатом для low-RAM self-host server. Но после fact-check нельзя утверждать, что go-fed "actively maintained": latest tagged release v1.0.0 был в 2020, репозиторий mature/stable, но low-activity. Fedify на 2026 выглядит активно развиваемым framework с WebFinger, HTTP Signatures, HTTP Message Signatures, NodeInfo, testing tools и adapters под SvelteKit/Postgres/Redis.

## Why Go (если ADR подтвердит Go)

### Go vs Ruby (Mastodon stack)
- Mastodon: Rails + Sidekiq + Redis + ElasticSearch = 4-6 GB RAM minimum для instance
- Go + PostgreSQL = 300-500 MB RAM для аналогичной функциональности
- Self-host UX: Mastodon требует Ruby runtime, bundler, nodejs для asset compilation. Go = одна бинарька.

### Go vs Elixir (Pleroma/Bonfire stack)
- Elixir отличный для concurrency, но:
  - Меньше разработчиков (barrier для контрибьюторов)
  - Phoenix release tooling сложнее для beginners
  - BEAM VM RAM footprint > Go binary
- GoToSocial на Go vs Pleroma на Elixir = GoToSocial выиграл "easiest self-host"

### Go vs Node.js (Fedify/TypeScript)
- Node.js не выполняет CPU-bound geo work так эффективно как Go, но основная geo-нагрузка всё равно в PostGIS.
- Node RAM consumption обычно выше, но для MVP это может быть приемлемой ценой за быстрее собранную federation layer.
- Fedify теперь реальная альтернатива, а не просто "новый проект": он закрывает много Fediverse boilerplate из коробки.
- Если выбираем Go, нужно либо принять maintenance risk go-fed, либо писать часть federation glue самостоятельно.

### Go vs PHP (Pixelfed/Laravel — текущий [operator instance] стек)
- PHP-FPM + nginx + OPcache — сложнее для turnkey deployment
- Memory footprint выше
- Нет готовой "good" ActivityPub library для PHP (landrok/activitypub существует, но меньше чем go-fed)
- [operator instance] PHP подход работает для нас как consumers — но не как federated instance

### Go vs Rust (Lemmy stack)
- Rust дает лучший performance, но:
  - Compile time — медленно для developer iteration
  - Learning curve = barrier для контрибьюторов
  - Ecosystem для ActivityPub + geo — меньше чем в Go
- Для 100-10k users перформанс Go достаточен

### Итого: Go — оптимальный trade-off
- Performance ✅ (достаточно)
- Self-host simplicity ✅ (GoToSocial доказал)
- Developer pool ✅ (больше чем Elixir/Rust)
- ActivityPub libraries ⚠️ (go-fed mature but low-activity; Fedify active but TypeScript)
- Concurrency ✅ (горутины нативно)

## Why PostgreSQL + PostGIS

### Альтернативы рассмотрены

| Альтернатива | Почему отвергнута |
|---|---|
| **SQLite** | Для 10-50 users OK, не масштабируется на 10k+ |
| **MySQL spatial** | Weaker geo-support чем PostGIS |
| **MongoDB + geo** | NoSQL не подходит для relational federation data |
| **Отдельный GIS server** (GeoServer) | Overkill, extra dependency |

### Преимущества PostgreSQL+PostGIS
- 15+ лет maturity
- KNN queries нативно (ST_Distance + ORDER BY)
- Индексы GIST для fast bbox queries
- PostGIS ST_ClusterDBSCAN для дедупа POI
- Hot standby + replication built-in
- JSON columns (jsonb) для flexibility

### Ограничения
- Для 10M+ POIs может требоваться sharding — не в scope Phase 1-5
- PostGIS = heavy extension (1-2 GB disk footprint с data)

## Why Centrifugo (не native WebSocket / Soketi / Phoenix)

### Что делает Centrifugo
Standalone WebSocket pub/sub server написан на Go. Отдельный процесс, интегрируется через HTTP API.

### Почему выбран

| Критерий | Native Go WS | Centrifugo | Soketi | Phoenix Channels |
|---|---|---|---|---|
| RAM | ~100 MB | ~50 MB | ~200 MB | ~300 MB (BEAM) |
| Language | Go | Standalone | Node.js | Elixir |
| Integration | Встроен | HTTP API | Pusher-compat | Phoenix-only |
| Scalability | Manual | Built-in | OK | Excellent |
| Production | Medium | High | Medium | High |

Centrifugo выигрывает: **standalone binary**, **proven scalability**, **language-agnostic**, **low RAM**. Отделение real-time от core логики = lower blast radius когда WebSocket component fails.

## Why Protomaps PMTiles (не OpenMapTiles / tile servers)

### Проблема классических tile servers
- OpenMapTiles требует PostgreSQL + tilelive-server stack
- Каждая подгрузка tile = HTTP request
- Stale tiles после обновления данных

### Protomaps PMTiles подход
- **Один файл** `.pmtiles` содержит vector tiles и читается через HTTP range requests
- Full planet Protomaps basemap z0-z15 на 2026 — порядка **120 GB**, не 1-2 GB
- Для дешёвого self-host default нужен regional extract или reduced maxzoom tileset
- Serverless: файл на S3/CDN, клиент читает напрямую через HTTP range requests
- MapLibre GL JS работает с PMTiles через `pmtiles` JS plugin и `addProtocol("pmtiles", ...)`
- Нет tile server infrastructure вообще
- Offline-capable после первой загрузки

### Альтернативы
- **OpenMapTiles** — self-host, полный tile server (overkill для large majority use cases)
- **Mapbox Studio** — закрытая, API key limits
- **Google Maps** — закрытая, expensive API
- **Stamen Toner/Terrain** — устарели, проект заморожен

Для нашего use case Protomaps PMTiles — идеален.

## Why MapLibre GL JS (не Leaflet / OpenLayers)

| Критерий | MapLibre GL JS | Leaflet | OpenLayers |
|---|---|---|---|
| Vector tiles | ✅ Native | ❌ (нужен plugin) | ✅ |
| WebGL rendering | ✅ | ❌ (canvas) | ✅ |
| 3D terrain | ✅ | ❌ | Частично |
| PMTiles | ✅ Через `pmtiles` protocol plugin | Plugin | Plugin |
| Bundle size | ~800 KB | ~150 KB | ~500 KB |
| Maturity | High (fork Mapbox) | Very high | Very high |
| Customization | Style JSON spec | jQuery-like API | Object-oriented |

MapLibre выигрывает по features (vector, WebGL, PMTiles), хотя bundle size больше. Для serious map app это оправдано.

[operator instance] уже использует MapLibre — консистентность подходов.

## Why SvelteKit (не Next.js / Nuxt / plain HTML)

### Sizing
- Next.js bundle (минимальный): ~150 KB
- SvelteKit bundle (минимальный): ~30 KB
- Для mobile users (travelers на слабом 4G) — важно

### SSR
- Оба SvelteKit и Next.js делают SSR
- Svelte компилируется в vanilla JS → runtime performance лучше
- Public pages (place/POI pages) SEO-ready

### Developer experience
- Svelte syntax ближе к HTML/CSS/JS без abstract concepts
- Меньше "magic" чем React Query/Redux
- Simpler state management (stores)

### Альтернативы
- **Vanilla HTML + MapLibre** — работает но сложно для интерактивности (social timeline, real-time)
- **React/Next.js** — heavy, лучше известен но overkill
- **HTMX + MapLibre** — интересный подход, но WebSocket/maps интеграция сложнее

## Why go-fed/activity (не Fedify / свой код)

### go-fed/activity
- Reference-quality ActivityPub/ActivityStreams library в Go
- Supports W3C AS Vocabulary
- Latest tagged release v1.0.0 от 2020; repo mature, но maintenance activity низкая
- Использовалась в production-проектах, но перед выбором нужен fresh spike и issue review

### Fedify (альтернатива)
- TypeScript/JavaScript — не Go, но хорошо сочетается со SvelteKit и быстрым прототипированием
- Активно развивается; включает WebFinger, HTTP Signatures, HTTP Message Signatures, NodeInfo, testing/debug tools
- Может быть лучшим выбором для Phase 1, если цель — быстрее получить совместимый ActivityPub MVP

### Свой код с нуля
- Overkill для MVP — ActivityPub сложный (HTTP Signatures, JSON-LD, WebFinger, WebSocket for streaming)
- Лучше build on top of выбранного framework, extend только где нужно

## Resource footprint estimates

### 100 users (small instance)
- Go binary: 300 MB RAM
- PostgreSQL+PostGIS: 1.5 GB RAM
- Centrifugo: 50 MB RAM
- Meilisearch (optional): 200 MB RAM
- **Total:** ~2 GB RAM, 2 vCPU, 50 GB disk
- **Cost:** ~$10-15/мес VPS (Hetzner CX22, DO 2GB droplet)

### 1,000 users
- Go binary: 500 MB
- PostgreSQL: 3 GB (tune shared_buffers, work_mem)
- Centrifugo: 150 MB
- **Total:** ~4 GB RAM, 4 vCPU, 200 GB disk
- **Cost:** ~$30/мес

### 10,000 users
- Scale-out: master + 2 replicas Postgres
- Centrifugo cluster (2-3 nodes)
- Go binary: можно оставить single (or scale horizontally)
- **Cost:** ~$150-300/мес

### Masterless micro-instance (family/small group, 5-10 users)
- Можно запустить на Raspberry Pi 4 (4 GB):
  - SQLite вместо PostgreSQL (Go поддерживает через modernc.org/sqlite)
  - Regional PMTiles file или reduced maxzoom tileset на SD карте
  - Без Meilisearch (PostgreSQL FTS)
- **Cost:** electricity only

## Trade-offs мы принимаем

- **Нет satellite imagery** — только vector tiles (Protomaps)
- **Geocoding — только через external Nominatim или ограниченный self-host** (full planet Nominatim на 2026: около 1 TB disk, 128 GB RAM strongly recommended)
- **Routing опционально** (OSRM self-host = 2 GB per region), не встроено в core
- **Нет iOS/Android native apps в Phase 1-4** — PWA first

---

## Fact-check questions для агентов

1. **Backend ADR:** Go/go-fed vs TypeScript/Fedify spike — что быстрее и надёжнее для MVP?
2. **PostGIS:** актуальная стабильная версия на 2026 (3.4 или выше)?
3. **Centrifugo:** проверить что v5 стабильна. Есть ли v6?
4. **Protomaps PMTiles:** есть ли мировой PMTiles файл to download? Размер актуальный (~120 GB full planet или иной)?
5. **MapLibre GL JS:** последняя версия? PMTiles protocol поддержка через `pmtiles` plugin?
6. **Nominatim self-host:** full planet requirements (1 TB disk, 128 GB RAM recommended) — подтвердить по актуальной версии docs.
7. **SvelteKit:** версия на 2026? Лучше чем Next.js для bundle size?
8. **Meilisearch:** лицензия MIT — подтвердить.
9. **Resource estimates:** 2 GB RAM для 100 users — реалистично? Сравнить с реальными GoToSocial deployments.
10. **Mastodon instance:** сколько RAM реально требует?
11. **Docker image size:** сколько примерно будет weigh готовый TrailFed Docker image?
12. **Fedify vs go-fed:** какой стек выбрать после spike? Не считать go-fed default без проверки maintenance/interoperability.
