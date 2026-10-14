---
title: TrailFed Vision
version: 0.2
status: draft
updated: 2026-10-14
---

# 01. Vision and problem

## Problem

People who travel self-sufficiently — vanlifers, RV owners, overlanders — all ask the same
questions: where can I stay tonight, where is water, where can I empty the tank, is that spot still
open? The answers are spread across many apps:

- **Park4Night** — campers and RVs in Europe, proprietary data
- **iOverlander** — overland spots, CSV export but no public API
- **Campendium**, **The Dyrt** — US campgrounds, closed databases
- **WikiCamps** — Australia, closed
- and a growing number of young independent apps and community sites

Each app owns **its own island of data**. A traveller who finds a barrier across a spot tells one
app; users of every other app drive there anyway. A small app can never collect enough fresh
reports on its own — and a new app starts from zero.

## Why earlier unification attempts failed

### FreeRoam (2019–2024)
Shut down in 2024: purely crowdsourced, no business model, no quality control, low-quality data
could not compete with proprietary sources.

### OpenCampingMap (opencampingmap.org)
Active but niche: a read-only view of OSM, no contributions, no API, no reviews.

### "Open camping standard" attempts
Several schema-only efforts never took off, for four reasons:

1. **Commercial moat** — every app treats its data as a competitive asset.
2. **Quality control is expensive** — moderation does not scale on volunteers.
3. **Liability** — nobody wants to be responsible for wrong data.
4. **No agreed schema** — every app has its own model.

## What v0.1 got right, and what it got wrong

v0.1 (April 2026) answered the moat with **federation**: no central database, every participant
owns its data and shares what it chooses. That insight stands.

But v0.1 tried to answer it with "Mastodon for travellers" — a new server for everyone to run, a
social network, check-ins, tracks, live location — on top of ActivityPub. Six months later the
reference server was frozen at a two-instance demo and no existing app, not even OpenVan.camp, was
connected. The reasons are recorded in [ADR-0010](adr/0010-sync-protocol-first.md); in short:

- existing apps will not run someone else's server — they need a spec to implement in their stack;
- ActivityPub announces news to followers, but cannot give a new participant the full history;
- places were records that got overwritten, so "closed" had no mechanism, and each instance decided
  for itself — the same spot could look different on every site.

## Insight for v0.2: federation needs a shared rule, not a shared server

Federation keeps the data where it is. To make the result _consistent_, participants need to agree
on only two things:

1. **Exchange facts, not records.** "Contributor X of app A saw a barrier at 09:20, here is a
   photo." Facts are appended, never overwritten, so there is nothing to fight over.
2. **Derive the status by the same rule.** The rule — when a spot counts as closed, when a report
   is just a report, when a spot is "not confirmed for a year" — is part of the protocol and pinned
   by test vectors. Same facts in, same status out, on every site.

Everything else — UI, moderation, business model, database — stays each app's own.

## Vision

**TrailFed is an open protocol that keeps travel place data in sync between independent apps.**

> A traveller marks a spot as closed in one app. Within minutes every connected app shows it closed
> — the same status, for the same reason, with credit to the app where it was reported.

The more apps join, the more travellers report, and the more current the shared picture becomes
for everyone. A new app gets the whole history on day one.

## Who it is for

### First: existing independent apps and sites
Apps with their own users that cannot match the big platforms' coverage alone. Joining gives them:

- **the full shared base on day one** (backfill), including OSM-derived places;
- **fresh status reports** from other apps' users;
- **visible credit and links back** wherever their reports are shown;
- **no lock-in** — they keep their database and can leave at any time.

### First implementation: OpenVan.camp
OpenVan.camp publishes its places (OSM-derived, ~1.1 million points) and its users' reports as the
first TrailFed feed, and reads others' feeds into its map.

### Later: new apps, tourism boards, municipalities
A new app implements a Reader in a week and starts with a populated map. Official sources (a
municipality banning overnight parking) can publish strong observations with a link to the decree.

### Legacy platforms
Closed platforms are not the target. If a shared, current base grows outside them, they may find a
reason to connect; the protocol does not depend on it.

## Deliverables

1. **Specification** — [core protocol](spec/core.md), [status resolution](spec/status-resolution.md),
   [JSON Schemas](spec/schema/), [test vectors](spec/vectors/).
2. **Reference implementation of the status rule** and a conformance runner.
3. **Small libraries** for common stacks (PHP/Laravel first, TypeScript next).
4. **Optional bridges** — [ActivityPub](spec/federation.md) announcements, OGC API – Features for GIS
   tools.

The v0.1 reference server stays in the repository as a frozen demo.

## Non-goals

- **Not a server everyone must run.** A protocol, implemented inside each app.
- **Not a social network** — follows, timelines, check-ins and tracks are out of the core.
- **No live location** — out of scope entirely.
- **Not a replacement for OSM** — OSM stays the base layer and the identity anchor; durable
  corrections belong in OSM, made by users.
- **Not a booking platform**, not navigation.
- **Not a central database** and not a data broker.

---

## Fact-check questions for agents

1. Is FreeRoam's shutdown (2024) correctly attributed to unsustainable crowdsourcing?
2. Is OpenCampingMap still read-only in 2026?
3. Does iOverlander's export licence allow redistribution? (Assume no until confirmed.)
4. Are there other sync protocols for crowdsourced place status (outside camping) we should borrow
   from?
5. What reporting thresholds do Waze / Google Maps use for "closed" — any public research?
