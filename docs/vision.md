---
title: TrailFed Vision
version: 0.1
status: draft
updated: 2026-04-22
---

# 01. Vision and problem

## Problem

The market for self-sufficient travel apps is fragmented. Vanlife, RV, overland, sailing, bike touring, motorcycle travel, trucking, and long-term travel use different tools, despite sharing many of the same concerns: where to stop, where to refuel, where to get water, where it's safe to spend the night, where to cross a border, where to find repairs, internet, and local infrastructure.

Today's user is forced to juggle 5–7 apps in parallel:

- **Park4Night** (~7M users) — points of interest for campers and RVs in Europe, proprietary data
- **iOverlander** — overland POIs, CSV export but no API
- **Campendium** (~750k contributors) — US campgrounds, closed database
- **The Dyrt** — subscription-based campgrounds with reviews
- **WikiCamps** — Australia only, closed
- **Polarsteps** — travel tracking, not geo-social
- **Navily / NoForeignLand / Waterway Guide** — marine/yacht POIs, marinas and anchorages, but siloed from road travel
- **Rever / Calimoto / OsmAnd / Komoot** — routing for motorcyclists, cyclists, and outdoor users, but without a federated POI layer
- **Mastodon/Twitter** — communication with other travellers, but no geodata

Each app owns **its own island of data**. Users manually copy points between apps, duplicate reviews, and never see the full picture.

## Why previous unification attempts failed

### FreeRoam (2019–2024)
Shut down in 2024. Root cause: a purely crowdsourced model with no commercial model, no quality control, no sustainability. Low-quality data could not compete with proprietary sources (Campendium). The successful outlier, KampTrail, took a different route — it uses verified federal data (RIDB API) and skipped crowdsourcing.

### OpenCampingMap (opencampingmap.org)
Exists and is active, but **niche**. Problems: read-only consumer OSM, no user contributions, no API for third-party apps, no review system. Volunteer-only, unable to compete with The Dyrt's marketing or Park4Night's UX.

### "Open camping standard" attempts
Multiple OGC / GTFS-style attempts failed to take off. Reasons:
1. **Commercial moat** — every app treats its data as a competitive asset. Handing it off to a central database means losing bargaining power.
2. **Quality control is expensive** — moderated contributions require paid moderators. A volunteer model does not scale.
3. **Liability** — companies fear being held responsible for incorrect data (wrong info → accident). Crowdsourced data without verification is a risk.
4. **No agreed schema** — every app uses its own data model.

## Insight: why a federated model works where centralization failed

The **Mastodon/ActivityPub** model (analogous to email or Git) addresses all four problems:

| Problem | Solution in the federated model |
|---|---|
| Commercial moat | Every instance owns its data and does not hand it to a "central" system. It shares only what it chooses. |
| Quality control | Each instance moderates itself. A pool of trusted peers produces a high-quality shared pool. |
| Liability | Data is signed by a specific instance/actor. Responsibility lies with the signer. |
| Agreed schema | W3C ActivityPub + AS Vocabulary (Place, Travel, Arrive) already exist. |

**Killer pitch for closed apps (Park4Night, etc.):** "You're not giving your data away — you're running your own instance. You share public POIs, not private user data. You receive federated data from other instances. You can exit at any time — disable federation and nothing breaks."

This is a **positive-sum game** instead of a zero-sum "who owns the database".

## Vision

**TrailFed is SMTP for travel POIs and travel social.** Open protocol + reference implementation + web client. Crucially, the project does not start as yet another centralized travel app, but as an open federation layer usable by self-hosters, community apps, tourism boards, and existing travel products.

Anyone can:

1. Clone from GitHub and run it on their own server (10-minute setup)
2. Get a full "POI map + travel social + federation layer" out of the box
3. Federate with trusted instances (POIs, posts, and check-ins sync according to a capability profile)
4. Integrate via REST API into any third-party application (similar to the OSM API)
5. Customize for their audience (RV, overland, sailing, bike touring, motorcycle travel, trucking, digital nomads)

## Target audience

### Primary: Self-hosters + technical travelers
The first 100–500 users — technical people who already follow `r/selfhosted`, `r/fediverse`, and know what Mastodon is. They stand up an instance, test it, and give feedback.

### Secondary: Community-driven apps
After Phase 2 — developers of existing travel apps. They see federation as a way to access a wider pool of data without giving up control.

### Tertiary: End users (travel-in-motion communities)
After Phase 4 — ordinary travellers register on public instances (the way people sign up on mastodon.social). They are not required to run their own server.

Target communities:

- Van / RV / caravan travelers
- Overlanders
- Sailors and boat owners
- Motorcycle travelers
- Bike tourers
- Digital nomads
- Long-term travelers and backpackers
- Truck drivers and professional road users

### Future: Legacy apps
Park4Night, iOverlander, Campendium — once 10k+ federated POIs exist outside their databases, they will have strong incentives to connect (or lose their edge).

## Product boundaries after fact-check

To avoid turning the project into "Mastodon + Park4Night + Strava + Find My" all at once, TrailFed is split into three deliverables:

1. **Protocol/spec** — a GeoSocial compatibility profile on top of ActivityPub/ActivityStreams: `Place`, `Arrive`, `Leave`, `Travel`, license metadata, source attribution, quality/confidence.
2. **Reference server** — federation, PostGIS storage, moderation, imports, REST API, admin tools.
3. **Web client** — map-first PWA for browsing and creating POIs, check-ins, reviews, and a basic social timeline.

Live location sharing remains an optional/future capability. It must not block the early POI federation MVP and requires its own threat-model review before production.

## Non-goals

What TrailFed **does not** do:
- Does not compete with OSM — additive, not a replacement. We use OSM as a base and add a layer of travel-specific data, reviews, confidence, and federation metadata.
- Not an Airbnb/Booking/Navily for stopovers and marinas — not a booking platform. We index points and public information; reservations are out of scope.
- Not a navigation system — routing is optional (via OSRM), but this is not a Google Maps killer.
- No satellite imagery — vector tiles only (Protomaps).
- Not a closed platform — AGPL-3; any fork must stay open.
- Not a platform for monetization — instances may be commercial (someone's business), but the protocol and reference server are open.
- Not a full Mastodon replacement in the early phases — Mastodon compatibility is needed for actors, follows, notes, and clients where practical, but `Place`/`Arrive`/`Travel` only work fully with geo-aware peers.
- Not a real-time tracking product in v1.0 — live location is high-risk, an opt-in future feature.

---

## Fact-check questions for agents

1. Where does the Park4Night user count (~7M) come from? Is it current as of 2026?
2. Did FreeRoam shut down in 2024 specifically due to unsustainable crowdsourcing, or are there other factors?
3. Does KampTrail actually use the RIDB API and reject crowdsourcing?
4. Does iOverlander really encourage contributions back to OSM (as we claim)?
5. Does Park4Night actively defend its data (any DMCA/legal cases)?
6. Does W3C ActivityPub/ActivityStreams actually have `Place`, `Travel`, `Arrive`, `Leave` types (initial fact-check: yes, via the ActivityStreams Vocabulary).
7. Is OpenCampingMap accurately described as "read-only consumer OSM"?
8. Are there other failed attempts at a camping standard beyond FreeRoam and OpenCampingMap?
9. Is "legacy apps will be forced to connect" accurate, or is "will have incentive to connect" better?
10. What is the minimum capability profile required for `Place` federation to be useful without a full social stack?
