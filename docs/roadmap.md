---
title: Roadmap and Implementation Phases
version: 0.2
status: draft
updated: 2026-10-14
---

# 09. Roadmap

## What changed in October 2026

The v0.1 roadmap (April 2026) planned seven phases to a turnkey social server — accounts, timeline,
check-ins, tracks, a map-first PWA — over 18–24 months. Phase 0 and most of Phase 1 were built in
two days, and then the project stalled: no existing app had a reason to run the server.

[ADR-0010](adr/0010-sync-protocol-first.md) refocuses TrailFed on a **sync protocol between
existing apps**. The plan below is shorter and is measured by one thing: **how many independent
apps show the same, current status for the same spots.**

| Phase | Goal | Done when |
|---|---|---|
| 0 | Scaffold + ActivityPub experiment | ✅ April 2026 — reference server frozen as a demo |
| 1 | Spec v0.2 | Core spec, schemas, status rule, test vectors, reference implementation; reviewed by 2 outside implementers |
| 2 | First publisher: OpenVan.camp | Public feed with OSM-derived places and users' reports; validator passes |
| 3 | Pilot with a second app | Closed in one app → closed in the other within 15 minutes, same status |
| 4 | Libraries and conformance | PHP and TypeScript packages; conformance runner against a live feed URL |
| 5 | Third participant, governance, 1.0 | Three independent apps; participant registry; spec 1.0 frozen |
| later | Bridges and extensions | ActivityPub announcements, OGC API – Features, relays, optional check-ins |

## Phase 0 — Scaffold and ActivityPub experiment (done, April 2026)

Delivered: monorepo, docker stack, Fedify actor/inbox/outbox, `Follow`/`Accept`, `Create Place`
round-trip between two instances, OSM PBF importer, PMTiles map, moderation primitives, CI, DCO,
landing site, reference instance at camp.trailfed.org. See [CHANGELOG](../CHANGELOG.md) 0.1.0.

Outcome: kept as a demo of the [ActivityPub bridge](spec/federation.md); not developed further
unless a participant needs it.

## Phase 1 — Spec v0.2

### Deliverables

- [x] [Core protocol](spec/core.md): entries, discovery, feed, push, identity, trust, privacy, licensing
- [x] [Status resolution](spec/status-resolution.md), normative
- [x] [JSON Schemas](spec/schema/) for entries and discovery
- [x] [Test vectors](spec/vectors/) for status resolution
- [x] Reference implementation `server/src/protocol/status.ts` passing all vectors
- [ ] Test vectors for identity: `same_as` / `not_same` groups and canonical URI
- [ ] Test vectors for attribute resolution (latest wins)
- [ ] Example feed (static JSON) that a reader can consume end-to-end
- [ ] Review by at least two developers of other travel apps

### Exit criteria

- Two outside reviewers say "I could implement this in my stack in a week".
- No open question in the spec that blocks a Reader implementation.

## Phase 2 — First publisher: OpenVan.camp

### Deliverables

- [ ] `/.well-known/trailfed` and feed on openvan.camp (Laravel)
- [ ] OSM-derived places published as `place` entries with ODbL attribution
- [ ] Users' reports from the OpenVan.camp map published as `observation` entries
- [ ] Per-place contributor pseudonyms and hour rounding
- [ ] Map shows the derived status (closed / reported / not confirmed for a year)
- [ ] Validator CLI: fetch a feed, validate against schemas, report errors

### Exit criteria

- A third party can backfill the full OpenVan.camp feed and resume from a cursor.
- Validator passes on the live feed.

## Phase 3 — Pilot with a second app

### Deliverables

- [ ] A second independent app publishes a feed and reads OpenVan.camp's
- [ ] OpenVan.camp reads the second app's feed and shows attribution
- [ ] Duplicate places linked automatically (OSM reference, distance + category)
- [ ] Optional signed push between the two

### Exit criteria

- A spot marked closed (with photo) in either app shows as closed in the other within 15 minutes.
- On a sample of 100 shared places both apps show identical status output.
- Thresholds T/W/S reviewed against pilot data.

## Phase 4 — Libraries and conformance

- [ ] PHP package (Laravel-friendly): feed client, entry validation, status resolution
- [ ] TypeScript package: the same
- [ ] Conformance runner: point it at a feed URL, get a report
- [ ] Integration guide "add TrailFed to your app in a week"

## Phase 5 — Third participant, governance, 1.0

- [ ] Third independent participant live
- [ ] Participant registry (who publishes what, contact, licence)
- [ ] Change process for the spec with participants' sign-off ([GOVERNANCE](../GOVERNANCE.md))
- [ ] Spec 1.0: no breaking changes without a major version

## Later

- ActivityPub bridge in a participant's production (announce new spots and closures)
- OGC API – Features read endpoint for GIS tools
- Relays/hubs when mesh polling stops scaling
- Optional extensions: check-ins, tracks — only if participants ask, each with its own review

## Timeline risks

- No second app agrees to a pilot → Phase 3 stalls (see [risks R18](risks.md#r18-no-second-participant))
- Status thresholds turn out wrong on real data → vectors and constants revised in a minor version
- Licence boundary between ODbL places and CC-BY observations needs expert review
- Single maintainer

---

## Fact-check questions for agents

1. Which independent vanlife/overland apps have public APIs or would plausibly pilot a sync feed?
2. Is 15 minutes a realistic propagation target with 1–15 minute polling?
3. What does an RPDE-style feed of ~1 million entries cost to serve (bandwidth, storage)?
4. Who in the OSM community can review the ODbL / CC-BY boundary?
