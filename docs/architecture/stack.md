---
title: Technology Stack
version: 0.1
status: draft
updated: 2026-04-22
---

# 04. Technology Choices and Rationale

## Overview of the final stack

| Layer | Technology | License | Why |
|---|---|---|---|
| Backend | **Go 1.22+** or **TypeScript/Fedify** | BSD / MIT | Go gives a single binary; Fedify may accelerate the ActivityPub MVP |
| ActivityPub | **ADR pending: go-fed/activity vs Fedify** | BSD / MIT | go-fed mature but low-activity; Fedify active and feature-rich |
| Database | **PostgreSQL 16 + PostGIS 3.4** | PostgreSQL + GPL | Industry standard for geodata, mature |
| Real-time | **Centrifugo v6** | Apache 2.0 | Standalone WebSocket Go server; optional until live features |
| Map tiles | **Protomaps PMTiles regional extracts** | BSD-3 / ODbL data | Single-file vector tiles, no API keys; full planet is large |
| Map rendering | **MapLibre GL JS + pmtiles plugin** | BSD-3 | Open fork of Mapbox, vector tiles support |
| Geocoding | **Nominatim** (optional) | AGPL-3 | Self-hostable OSM geocoding |
| Search | **Meilisearch** (optional) | MIT | Simple self-host full-text |
| Frontend | **SvelteKit** | MIT | SSR + SPA, light bundle, map-friendly |
| Containerization | **Docker Compose** | Apache 2.0 | Standard turnkey deployment |

## Backend decision: Go vs TypeScript/Fedify

**Current recommendation:** do not lock in Go before ADR-001. Phase 0 requires a spike:

1. Minimal `Actor` + WebFinger + signed inbox/outbox on Go/go-fed.
2. The same on TypeScript/Fedify.
3. Compare effort, compatibility, maintenance risk, Docker footprint, and developer velocity.

Go remains a strong candidate for a low-RAM self-host server. But after fact-checking, we cannot claim that go-fed is "actively maintained": the latest tagged release v1.0.0 was in 2020; the repository is mature/stable but low-activity. As of 2026, Fedify appears to be an actively developed framework covering WebFinger, HTTP Signatures, HTTP Message Signatures, NodeInfo, testing tools, and adapters for SvelteKit/Postgres/Redis.

## Why Go (if the ADR confirms Go)

### Go vs Ruby (Mastodon stack)
- Mastodon: Rails + Sidekiq + Redis + ElasticSearch = 4-6 GB RAM minimum per instance
- Go + PostgreSQL = 300-500 MB RAM for comparable functionality
- Self-host UX: Mastodon requires Ruby runtime, bundler, and nodejs for asset compilation. Go = a single binary.

### Go vs Elixir (Pleroma/Bonfire stack)
- Elixir is excellent for concurrency, but:
  - Smaller developer pool (barrier for contributors)
  - Phoenix release tooling is harder for beginners
  - BEAM VM RAM footprint > Go binary
- GoToSocial (Go) vs Pleroma (Elixir): GoToSocial won "easiest self-host"

### Go vs Node.js (Fedify/TypeScript)
- Node.js does not handle CPU-bound geo work as efficiently as Go, though the main geo workload lives in PostGIS anyway.
- Node RAM consumption is typically higher, but for an MVP this may be an acceptable price for a faster-built federation layer.
- Fedify is now a real alternative, not just a "new project": it covers a lot of Fediverse boilerplate out of the box.
- If we pick Go, we must either accept the maintenance risk of go-fed or write part of the federation glue ourselves.

### Go vs PHP (Pixelfed/Laravel — the current [operator instance] stack)
- PHP-FPM + nginx + OPcache is harder for turnkey deployment
- Memory footprint is higher
- No well-maintained ActivityPub library for PHP (landrok/activitypub exists but is smaller than go-fed)
- The [operator instance] PHP approach works for us as consumers, but not as a federated instance

### Go vs Rust (Lemmy stack)
- Rust gives better performance, but:
  - Compile times — slow for developer iteration
  - Learning curve = barrier for contributors
  - Ecosystem for ActivityPub + geo is smaller than Go's
- For 100-10k users, Go's performance is sufficient

### Bottom line: Go is the optimal trade-off
- Performance ✅ (sufficient)
- Self-host simplicity ✅ (GoToSocial proved it)
- Developer pool ✅ (larger than Elixir/Rust)
- ActivityPub libraries ⚠️ (go-fed mature but low-activity; Fedify active but TypeScript)
- Concurrency ✅ (goroutines are native)

## Why PostgreSQL + PostGIS

### Alternatives considered

| Alternative | Why rejected |
|---|---|
| **SQLite** | OK for 10-50 users, does not scale to 10k+ |
| **MySQL spatial** | Weaker geo-support than PostGIS |
| **MongoDB + geo** | NoSQL is a poor fit for relational federation data |
| **Separate GIS server** (GeoServer) | Overkill, extra dependency |

### Advantages of PostgreSQL+PostGIS
- 15+ years of maturity
- Native KNN queries (ST_Distance + ORDER BY)
- GIST indexes for fast bbox queries
- PostGIS ST_ClusterDBSCAN for POI dedup
- Built-in hot standby + replication
- JSON columns (jsonb) for flexibility

### Limitations
- For 10M+ POIs, sharding may be required — out of scope for Phases 1-5
- PostGIS is a heavy extension (1-2 GB disk footprint with data)

## Why Centrifugo (not native WebSocket / Soketi / Phoenix)

### What Centrifugo does
A standalone WebSocket pub/sub server written in Go. A separate process, integrated via an HTTP API.

### Why it was chosen

| Criterion | Native Go WS | Centrifugo | Soketi | Phoenix Channels |
|---|---|---|---|---|
| RAM | ~100 MB | ~50 MB | ~200 MB | ~300 MB (BEAM) |
| Language | Go | Standalone | Node.js | Elixir |
| Integration | Embedded | HTTP API | Pusher-compat | Phoenix-only |
| Scalability | Manual | Built-in | OK | Excellent |
| Production | Medium | High | Medium | High |

Centrifugo wins on: **standalone binary**, **proven scalability**, **language-agnostic**, **low RAM**. Separating real-time from core logic = lower blast radius when the WebSocket component fails.

## Why Protomaps PMTiles (not OpenMapTiles / tile servers)

### The problem with classic tile servers
- OpenMapTiles requires a PostgreSQL + tilelive-server stack
- Every tile fetch = an HTTP request
- Stale tiles after data updates

### The Protomaps PMTiles approach
- **A single `.pmtiles` file** holds vector tiles and is read via HTTP range requests
- The full-planet Protomaps basemap z0-z15 as of 2026 is roughly **120 GB**, not 1-2 GB
- A cheap self-host default needs a regional extract or a reduced-maxzoom tileset
- Serverless: the file sits on S3/CDN, the client reads it directly via HTTP range requests
- MapLibre GL JS works with PMTiles via the `pmtiles` JS plugin and `addProtocol("pmtiles", ...)`
- No tile server infrastructure at all
- Offline-capable after the first load

### Alternatives
- **OpenMapTiles** — self-host, full tile server (overkill for the large majority of use cases)
- **Mapbox Studio** — closed, API key limits
- **Google Maps** — closed, expensive API
- **Stamen Toner/Terrain** — outdated, project frozen

Protomaps PMTiles is ideal for our use case.

## Why MapLibre GL JS (not Leaflet / OpenLayers)

| Criterion | MapLibre GL JS | Leaflet | OpenLayers |
|---|---|---|---|
| Vector tiles | ✅ Native | ❌ (needs plugin) | ✅ |
| WebGL rendering | ✅ | ❌ (canvas) | ✅ |
| 3D terrain | ✅ | ❌ | Partial |
| PMTiles | ✅ Via `pmtiles` protocol plugin | Plugin | Plugin |
| Bundle size | ~800 KB | ~150 KB | ~500 KB |
| Maturity | High (Mapbox fork) | Very high | Very high |
| Customization | Style JSON spec | jQuery-like API | Object-oriented |

MapLibre wins on features (vector, WebGL, PMTiles), even though the bundle is larger. For a serious map app this is justified.

[operator instance] already uses MapLibre — consistency of approach.

## Why SvelteKit (not Next.js / Nuxt / plain HTML)

### Sizing
- Next.js bundle (minimal): ~150 KB
- SvelteKit bundle (minimal): ~30 KB
- Matters for mobile users (travelers on poor 4G)

### SSR
- Both SvelteKit and Next.js do SSR
- Svelte compiles to vanilla JS → better runtime performance
- Public pages (place/POI pages) are SEO-ready

### Developer experience
- Svelte syntax is closer to HTML/CSS/JS without abstract concepts
- Less "magic" than React Query/Redux
- Simpler state management (stores)

### Alternatives
- **Vanilla HTML + MapLibre** — works, but hard for interactivity (social timeline, real-time)
- **React/Next.js** — heavy, better known but overkill
- **HTMX + MapLibre** — an interesting approach, but WebSocket/maps integration is harder

## Why go-fed/activity (not Fedify / rolling our own)

### go-fed/activity
- Reference-quality ActivityPub/ActivityStreams library in Go
- Supports the W3C AS Vocabulary
- Latest tagged release v1.0.0 from 2020; the repo is mature but maintenance activity is low
- Used in production projects, but a fresh spike and issue review are required before committing

### Fedify (alternative)
- TypeScript/JavaScript — not Go, but pairs well with SvelteKit and rapid prototyping
- Actively developed; includes WebFinger, HTTP Signatures, HTTP Message Signatures, NodeInfo, and testing/debug tools
- May be the better choice for Phase 1 if the goal is a compatible ActivityPub MVP sooner

### Rolling our own
- Overkill for an MVP — ActivityPub is complex (HTTP Signatures, JSON-LD, WebFinger, WebSocket for streaming)
- Better to build on top of the chosen framework and extend only where needed

## Resource footprint estimates

### 100 users (small instance)
- Go binary: 300 MB RAM
- PostgreSQL+PostGIS: 1.5 GB RAM
- Centrifugo: 50 MB RAM
- Meilisearch (optional): 200 MB RAM
- **Total:** ~2 GB RAM, 2 vCPU, 50 GB disk
- **Cost:** ~$10-15/month VPS (Hetzner CX22, DO 2GB droplet)

### 1,000 users
- Go binary: 500 MB
- PostgreSQL: 3 GB (tune shared_buffers, work_mem)
- Centrifugo: 150 MB
- **Total:** ~4 GB RAM, 4 vCPU, 200 GB disk
- **Cost:** ~$30/month

### 10,000 users
- Scale-out: master + 2 Postgres replicas
- Centrifugo cluster (2-3 nodes)
- Go binary: can remain single (or scale horizontally)
- **Cost:** ~$150-300/month

### Masterless micro-instance (family/small group, 5-10 users)
- Can run on a Raspberry Pi 4 (4 GB):
  - SQLite instead of PostgreSQL (Go supports it via modernc.org/sqlite)
  - Regional PMTiles file or reduced-maxzoom tileset on an SD card
  - No Meilisearch (PostgreSQL FTS)
- **Cost:** electricity only

## Trade-offs we accept

- **No satellite imagery** — vector tiles only (Protomaps)
- **Geocoding — only via external Nominatim or a limited self-host** (full-planet Nominatim in 2026: about 1 TB disk, 128 GB RAM strongly recommended)
- **Routing is optional** (OSRM self-host = 2 GB per region), not built into the core
- **No native iOS/Android apps in Phases 1-4** — PWA first

---

## Fact-check questions for agents

1. **Backend ADR:** Go/go-fed vs TypeScript/Fedify spike — which is faster and more reliable for the MVP?
2. **PostGIS:** current stable version in 2026 (3.4 or later)?
3. **Centrifugo:** confirm that v5 is stable. Is there a v6?
4. **Protomaps PMTiles:** is there a worldwide PMTiles file to download? Current size (~120 GB full planet or different)?
5. **MapLibre GL JS:** latest version? PMTiles protocol support via the `pmtiles` plugin?
6. **Nominatim self-host:** full-planet requirements (1 TB disk, 128 GB RAM recommended) — confirm against current docs.
7. **SvelteKit:** version in 2026? Better than Next.js for bundle size?
8. **Meilisearch:** MIT license — confirm.
9. **Resource estimates:** 2 GB RAM for 100 users — realistic? Compare to real GoToSocial deployments.
10. **Mastodon instance:** how much RAM does it actually require?
11. **Docker image size:** roughly how large will the finished TrailFed Docker image be?
12. **Fedify vs go-fed:** which stack do we choose after the spike? Do not treat go-fed as the default without verifying maintenance/interoperability.
