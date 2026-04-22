---
title: Roadmap and Implementation Phases
version: 0.2
status: draft
updated: 2026-04-22
---

# 09. Roadmap

## Overview after fact-check

The initial roadmap was too packed: a full Mastodon-compatible server + POI federation + maps + live location + travel tracks in 15-18 months for 1-2 devs carries high delivery risk.

Updated strategy: first prove out **travel POI federation + map-first UX**, and push live location beyond v1.0 as a high-risk future capability.

| Phase | Duration | Key goal |
|---|---|---|
| 0 | Weeks 1-8 | Spec, ADRs, naming, community |
| 1 | Months 3-5 | Federation foundation + backend ADR |
| 2 | Months 6-9 | Places MVP + OSM import + moderation |
| 3 | Months 10-12 | Map-first web client + public beta |
| 4 | Months 13-16 | Check-ins, reviews, travel tracks |
| 5 | Months 17-24 | Turnkey polish, security review, v1.0 |
| 6 | After v1.0 | Ecosystem, hosting, optional live location research |

**Realistic target:** 6 months to a technical MVP, 12 months to a usable public beta, 18-24 months to v1.0 without live location.

## Phase 0 — Spec & Community (Weeks 1-8)

**Scope:** documentation, fact-checking, ADRs, protocol. Minimal spikes are allowed only to pick the stack.

### Deliverables

- [ ] Final name/domain/trademark check
- [ ] GitHub org/repo after the naming decision
- [ ] Landing page
- [ ] ADR-001: Backend stack — Go/go-fed vs TypeScript/Fedify
- [ ] ADR-002: ActivityPub + GeoSocial compatibility profile
- [ ] ADR-003: OSM/ODbL data boundary
- [ ] ADR-004: Licensing: AGPL server, permissive SDK, CC BY spec, ODbL-compatible data exports
- [ ] ADR-005: Live location deferred policy
- [ ] Draft OpenAPI spec
- [ ] Draft Federation spec
- [ ] Draft admin/moderation guide
- [ ] Matrix/Discord community channel

### Required spikes

- [ ] Minimal Actor/WebFinger/inbox on Go/go-fed
- [ ] Minimal Actor/WebFinger/inbox on TypeScript/Fedify
- [ ] PBF extract importer proof-of-concept for one small region
- [ ] PMTiles regional extract proof-of-concept with MapLibre

### Exit criteria

- Backend ADR accepted
- Federation profile reviewed by at least 2 ActivityPub/Fediverse people
- OSM/ODbL boundary reviewed by an OSM-savvy contributor
- No blocker issue in naming/trademark

## Phase 1 — Federation Foundation (Months 3-5)

**Scope:** a minimal ActivityPub-compatible server foundation. We are not building a full Mastodon clone.

### Deliverables

- [ ] Actor model + registration + login
- [ ] WebFinger, NodeInfo, actor object
- [ ] Signed inbox POST verification
- [ ] Signed outgoing POST delivery
- [ ] Legacy Cavage HTTP Signatures for Fediverse interop
- [ ] Optional RFC 9421 support if framework cost low
- [ ] Follow/Accept/Reject minimal flow
- [ ] Create/Update/Delete `Note` minimal support
- [ ] Peer table: trusted/graylist/blocklist
- [ ] Docker Compose setup
- [ ] Federation test scripts

### Non-goals

- Full Mastodon API compatibility
- Native mobile client support
- Full social timeline product
- Places federation beyond smoke test

### Milestones

- `docker compose up` starts a minimal instance
- Local actor can be discovered via WebFinger
- Signed activity can be exchanged with a test peer
- Basic follow with Mastodon/GoToSocial is tested where possible

## Phase 2 — Places MVP (Months 6-9)

**Scope:** POIs as first-class objects, REST API, import pipeline, moderation.

### Deliverables

- [ ] `places`, `place_sources`, `activities`, `peers` schema
- [ ] PostGIS bbox/radius query API
- [ ] `Place` serialization per GeoSocial compatibility profile
- [ ] `Create/Update/Delete{Place}` federation between trusted TrailFed peers
- [ ] PBF/Geofabrik importer for selected regions
- [ ] Overpass only for small bbox/dev queries
- [ ] places.pub lookup/reference integration
- [ ] Moderation queue for remote Place creates/updates
- [ ] Dedup candidate scoring and merge queue
- [ ] GeoJSON/CSV export with attribution/license metadata

### Milestones

- First federated POI: instance A creates, instance B receives/moderates/displays
- Import 10k+ OSM-derived places for one test region
- Duplicate detection catches obvious same-location POIs

## Phase 3 — Map-First Web Beta (Months 10-12)

**Scope:** usable PWA for browsing/searching/contributing POIs.

### Deliverables

- [ ] SvelteKit frontend
- [ ] MapLibre GL JS + `pmtiles` protocol plugin
- [ ] Regional PMTiles default setup
- [ ] Clustered POI markers
- [ ] Place detail drawer/page
- [ ] Create/edit POI UI
- [ ] Moderation UI
- [ ] Peer/admin settings UI
- [ ] Basic profile/timeline pages
- [ ] i18n foundation: EN first, RU/DE/FR/ES/PT after beta

### Non-goals

- Offline whole-country maps as default
- Background tracking
- Public nearby users

### Milestones

- 5 beta testers deploy independently
- One public OpenVan-backed instance runs for 30 days
- Lighthouse/mobile usability passes basic thresholds

## Phase 4 — Check-ins, Reviews, Travel Tracks (Months 13-16)

**Scope:** add social/travel value without real-time tracking.

### Deliverables

- [ ] Check-in endpoint and UI
- [ ] `Arrive`/`Leave` activities between TrailFed peers
- [ ] Reviews with a clear non-OSM license boundary
- [ ] Quality tiers from source confidence + community verification
- [ ] GPX upload/import
- [ ] `Travel` activity for published tracks
- [ ] Track rendering on map
- [ ] Abuse controls: fake check-ins, impossible travel, review spam

### Milestones

- Check-in on instance A visible on instance B
- Track upload published as an ActivityStreams object
- Quality tier visible in UI and API

## Phase 5 — Turnkey v1.0 (Months 17-24)

**Scope:** production readiness for small/medium instances.

### Deliverables

- [ ] One-command-ish installer, but avoid unsafe `curl | bash` as the only path
- [ ] Backup/restore tooling
- [ ] Health checks and metrics
- [ ] Admin documentation
- [ ] API reference
- [ ] Federation integration guide
- [ ] Instance directory
- [ ] Security hardening guide
- [ ] Privacy/legal templates for admins
- [ ] Third-party review or at least an external security/privacy review

### v1.0 definition

- POI federation stable
- Imports and attribution reliable
- Moderation queue usable
- Public instance can run for 90 days without manual DB surgery
- Live location disabled/not included by default

## Phase 6 — Ecosystem / Future

### Directions

- Managed hosting packages: PikaPods/Elestio/Cloudron after v1.0
- SDKs and API clients
- OpenVan integration as consumer and reference instance
- Tourism board / regional dataset imports
- Native apps only if background location/tracks become core
- Live location research only after a dedicated safety audit

## Team assumptions

### Realistic minimum

- 1 lead maintainer part-time: 24+ months to v1.0
- 1 lead maintainer full-time + 2-3 regular contributors: 18-24 months
- 2 full-time maintainers + contributors: 12-18 months possible, but still aggressive

## Timeline risks

- Backend ADR chooses the wrong library and forces a rewrite
- ActivityPub interop edge cases
- ODbL/data-license boundary mistakes
- Moderation workload underestimated
- Map/import pipeline larger than expected
- Funding delays
- Scope creep into live location/native apps before POI federation works

---

## Fact-check questions for agents

1. Is a Phase 1 foundation in 3 months after the backend ADR realistic?
2. Which stack yields a compatible ActivityPub MVP faster: Go/go-fed or TypeScript/Fedify?
3. How long does a PBF importer with osmium/osm2pgsql actually take?
4. 18-24 months to v1.0 without live location — realistic for 1-2 maintainers?
5. Who can do an external ActivityPub/security/privacy review, and what does it cost?
6. What criteria are needed to call POI federation "stable"?
7. Do we need Mastodon API compatibility at all, or is ActivityPub + our own REST API enough?
