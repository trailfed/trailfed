---
title: TrailFed uniqueness analysis
version: 0.2
status: draft
updated: 2026-10-14
---

# 02. Uniqueness and comparison with existing projects

## TL;DR (v0.2)

No open protocol was found that lets independent travel apps keep **one shared, current status of
places** — with backfill for newcomers, a common rule for "closed", per-entry licensing and
attribution. That is TrailFed's gap in v0.2.

Social, check-ins and tracks (the v0.1 framing) are out of the core; the comparison of social
projects below is kept for context and for the optional ActivityPub bridge.

## Prior art for the sync layer (v0.2)

| Project / standard | What it solves | What TrailFed takes |
|---|---|---|
| **OpenStreetMap tagging** | Shared vocabulary for campsites, water, dump stations | Category and attribute keys; OSM element id as the strongest identity signal |
| **OSM minutely replication diffs** | Incremental change stream for a huge dataset | The idea that catch-up by sequence number is the backbone of sync |
| **RPDE** (OpenActive) | Paged change feed with opaque cursor, tombstones | Feed design almost verbatim ([core §5.1](spec/core.md#51-feed-pull-required-for-publishers)) |
| **OCPI** (EV charging roaming) | Competing operators exchange charge-point locations and status via push/PATCH | Proof that competitors do share location status when there is a mutual gain; push + credentials ideas |
| **GBFS** (bike share) | Simple public feeds with discovery file | `/.well-known` discovery, "small enough to implement in a week" |
| **Mangrove Reviews** | Open review dataset for places, used by MapComplete | Review shape kept mappable to Mangrove |
| **places.pub** | OSM places as ActivityStreams `Place` objects | Optional reference URIs for the ActivityPub bridge |
| **Overture GERS** | Stable global IDs for places across datasets | Watch; MAY be used as an extra identity signal later |
| **OGC API – Features** | Standard read API for geodata; Part 4 (CRUD) still a draft in 2026-10 | Optional extra read endpoint for GIS tools; not the sync channel |
| **Federal Camping Data Standard** (US) | Field list for public campgrounds | Checklist for attribute keys |

None of them combines immutable observations, a normative status rule with test vectors, backfill
and per-entry licensing for travel places.

## Comparison table (social / geo-social projects, v0.1)

| Project | Social layer | POI DB | Federated | Live loc. | Travel tracks | Self-host | Stack |
|---|---|---|---|---|---|---|---|
| **Mastodon** | Yes | No | Yes | No | No | Yes | Ruby/Rails |
| **GoToSocial** | Yes | No | Yes | No | No | Yes | Go |
| **Pleroma/Akkoma** | Yes | No | Yes | No | No | Yes | Elixir |
| **Pixelfed** | Yes (photos) | No | Yes | No | No | Yes | PHP/Laravel |
| **Mobilizon** | Yes (events) | No | Yes | No | No | Yes | Elixir |
| **Bonfire** | Yes | Partial (alpha) | Yes | Partial (planned) | No | Yes | Elixir |
| **Open Pace** | Yes (fitness) | No | Yes | No | Yes (GPX) | Yes | Ruby |
| **iOverlander** | No | Yes | No | No | No | No | Proprietary |
| **Park4Night** | Partial (light) | Yes | No | No | No | No | Proprietary |
| **Campendium** | Partial (reviews) | Yes | No | No | No | No | Proprietary |
| **The Dyrt** | Yes | Yes | No | No | No | No | Proprietary |
| **Polarsteps** | Partial (light) | No | No | Yes (friends) | Yes | No | Proprietary |
| **OpenCampingMap** | No | Yes (OSM ro) | No | No | No | Yes | Python |
| **places.pub** | No | Yes | Yes | No | No | Partial | TypeScript |
| **TrailFed v0.2** | Bridge only | Shared, per participant | Yes (sync protocol) | No | No | Not required | Any stack |

## Detailed review of conceptually adjacent projects

### Bonfire ([bonfirenetworks.org](https://bonfirenetworks.org))
**Status:** active development, alpha stage. Experimenting with a geosocial extension.

**What they do:** a modular Fediverse framework in Elixir. They promise "location-based activities, check-ins, maps, places.pub integration" — but this is pre-release with no production deployment.

**Why not a competitor:**
- Slow-moving (low release cadence)
- General-purpose framework, not travel-focused
- No live location sharing on the roadmap
- Elixir — a specialized language with a small developer pool

**Potential collaboration:** cross-federation is possible (both are ActivityPub-compatible).

### Open Pace ([open-pace.com](https://www.open-pace.com/))
**Status:** production-ready, niche (sport/fitness).

**What they do:** federated Strava — users publish running and cycling activities, GPX tracks, and receive likes and comments over ActivityPub.

**Why not a competitor:**
- Sport-focused, not travel infrastructure — no POI federation, stopovers, marinas, services, borders, or fuel/water/repair context
- Activities are short (run/ride), not long-term travel stories
- No live location (post-hoc upload only)

**What we borrow:** the GPX → ActivityPub Activity mapping architecture.

### Mobilizon ([joinmobilizon.org](https://joinmobilizon.org))
**Status:** production, maintained by Framasoft.

**What they do:** federated events platform. "ActivityPub for events". Event map, geo-search.

**Why not a competitor:**
- Events, not POIs. An event is temporary (from-to dates); a POI is permanent.
- No check-ins, live location, or travel tracks
- No social posts beyond events

**What we borrow:** their approach to geosearch and `Event` object federation.

### places.pub ([places.pub](https://places.pub/), [GitHub](https://github.com/social-web-foundation/places.pub))
**Status:** active/experimental, developed by the Social Web Foundation.

**What they do:** publish OSM data as ActivityStreams/ActivityPub-compatible `Place` objects. URL schema: `https://places.pub/{node|way|relation}/{id}`. The objects are not ActivityPub Actors: they have no inbox/outbox and cannot be followed as a server peer.

**Why not a competitor:** **this is a complementary project.** They are a POI data provider. We are a consumer and extender (adding reviews, check-ins, quality tiers).

**Planned collaboration:** TrailFed uses places.pub as the canonical AS2 Place reference/lookup. This is not full two-way federation: we fetch/read their objects but do not send them activities.

### GoToSocial ([gotosocial.org](https://gotosocial.org))
**Status:** beta (left alpha in Sept 2024). Under active development.

**What they do:** a lightweight Mastodon alternative in Go. Single binary, minimal dependencies.

**Why not a competitor:** they are a general-purpose ActivityPub server. We are travel-specific with POIs, check-ins, live location.

**What we borrow:** architectural principles (single binary, low RAM, AGPL license) and a Mastodon-API compatibility layer.

## What already does NOT exist (verified)

After initial research on 2026-04-22, we did not find:
- A federated POI database for travellers with a review system
- A "Mastodon for travellers" with the map as the primary interface
- Turnkey self-host solutions for geo-social (Mobilizon is the closest, but events only)
- A production-ready ActivityPub check-in/POI server with moderation and import tooling

## ATProto / Bluesky

Verified: as of 2026-04-22 there is no ATProto-based travel/geo-social project. Bluesky's AT Protocol is an alternative federation architecture (PDS model). In theory TrailFed could be built on it, but:
- ATProto is less mature than ActivityPub
- Fewer existing clients
- No Place/Travel primitives in the AT Lexicons

Decision: we proceed with ActivityPub. Future ATProto compatibility will go through a bridge (projects like bridgy.fed already exist).

## Positioning in the W3C ecosystem

**The W3C Social Web Community Group** has an active workgroup, `swicg/geosocial` ([github.com/swicg/geosocial](https://github.com/swicg/geosocial)) — a draft geosocial extension for ActivityPub. Pre-1.0, not widely adopted.

**Our strategy:** TrailFed is one of the first production-oriented implementations of these geosocial patterns. We do not claim "reference implementation" status without coordination with the Social Web CG / SWF. This gives us:
- Standardization momentum (we are a driver, not a follower)
- Credibility through reusing W3C vocabulary and participation in SWICG/GeoSocial
- Cross-compatibility with future implementations

## What did we miss? (open questions)

- The Japanese Fediverse may have local travel-specific projects — not investigated in detail
- The Chinese/Korean federation market is closed (WeChat), but open projects may exist
- Academic work on federated POIs (DecKG, federated recommendation systems) exists but is not production-grade

---

## Fact-check questions for agents

1. **Bonfire status:** check their GitHub repos (bonfire-networks/bonfire-app, bonfire-social, etc.) — what stage? Production or alpha?
2. **Open Pace:** when was their latest GitHub commit (myfear/open-pace)? Active?
3. **places.pub:** check the current API — do they actually publish OSM as Place objects? How many POIs?
4. **GoToSocial:** confirm they left alpha in 2024. What is the current status?
5. **Mobilizon:** check whether they have built-in check-ins for events.
6. **iOverlander:** check their FAQ/API docs — do they definitely encourage OSM contribution?
7. **swicg/geosocial:** is the workgroup active? Latest commit?
8. **Pixelfed:** have they added geotagging to posts (GitHub issue)?
9. **Misskey / Sharkey:** did we miss these Mastodon forks? Are there travel-specific forks?
10. **ATProto:** are there known AT Protocol travel/geo apps under development?
11. **Japanese Fediverse:** are there local travel-specific Fediverse projects (check via fediverse-observer, fediverse.info)?
12. **Academic:** are there open-source academic projects in federated POI (check arxiv.org)?
13. **checkin.swf.pub:** check the status of the Social Web Foundation's geosocial check-in client and the lessons for TrailFed.
