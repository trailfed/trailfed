# ADR-0010: Sync protocol first — observations, feeds and a shared status rule

**Status:** Accepted
**Date:** 2026-10-14
**Deciders:** @kopaev

## Context

TrailFed v0.1 (April 2026) was framed as "Mastodon for travellers": every community runs a TrailFed
server, places and check-ins spread over ActivityPub to followers. A reference server was built
(Fedify, Follow/Accept, `Create Place` round-trip) and then stalled; six months later the only
commits are dependency bumps, and not even OpenVan.camp — the project's own first user — is
connected.

Reviewing v0.1 against the concrete goal ("a spot marked closed in one app shows as closed in the
others") found these problems:

1. **Wrong first adopter.** Existing apps already have users, databases and stacks. They will not
   run a separate TypeScript/Postgres/Centrifugo server; they need a spec they can implement in
   their own code.
2. **Scope.** Social timeline, check-ins, tracks and live location were in scope, and live location
   consumed a large share of the design. None of it is needed for a shared, current place base.
3. **ActivityPub is a notification channel, not a sync channel.** It pushes new activities to
   followers but has no standard way for a newcomer to fetch the full history, and missed
   deliveries are lost.
4. **Records instead of facts.** `Update{Place}` overwrites fields (last writer wins); temporary
   closure had no mechanism at all.
5. **Each instance decides for itself** on merges and quality (`qualityTier` set by the sender), so
   the same place could look different on every site — the opposite of the goal.
6. `price_eur` in the place schema stores a currency-dependent value, which goes stale with the
   exchange rate.
7. No test vectors — every implementer would read the spec differently.

## Decision

1. TrailFed is first of all a **protocol for keeping place data in sync between existing apps**
   ([docs/spec/core.md](../spec/core.md)).
2. Participants exchange **immutable entries**: `place`, `observation`, `link`, `retraction`.
   Status is **derived**, never overwritten.
3. **Status resolution is normative** and pinned by test vectors
   ([docs/spec/status-resolution.md](../spec/status-resolution.md), [vectors/](../spec/vectors/)), so
   participants with the same inputs show the same status.
4. Transport: a **pull feed with cursor and full history** (RPDE-style) is required; **signed push**
   (RFC 9421, Ed25519) is an optional latency hint.
5. Identity: OSM reference first, then `same_as` / `not_same` links; the canonical URI is computed
   deterministically.
6. Prices are stored as local amount + currency only.
7. **ActivityPub becomes an optional bridge** ([docs/spec/federation.md](../spec/federation.md)) for
   announcing to the Fediverse; social features, check-ins, tracks and live location leave the core.
8. The reference server is **frozen as a demo**. Deliverables are the spec, schemas, vectors, the
   reference status implementation and small libraries for common stacks. OpenVan.camp is the first
   implementation.

## Consequences

**Positive**
- An app can implement a Reader/Publisher in days, inside its own stack.
- New participants get the full history on day one — the main reason to join.
- "Closed in one app → closed everywhere" is testable with vectors.

**Negative**
- Not Fediverse-native: Mastodon users only see what the bridge announces.
- Mesh polling (each participant reads every other) is fine for tens of participants, not thousands;
  relays are deferred.
- Two years of v0.1 roadmap (social, tracks) are dropped from the plan.

**Neutral**
- ADRs 0001–0008 remain valid for the frozen reference server.
- AGPL (ADR-0005) still covers the code; data licensing is per entry ([ADR-0011](0011-per-entry-data-license.md)).

## Alternatives considered

- **Keep ActivityPub as the sync channel** — rejected: no backfill, lossy delivery, a social graph
  where none is needed.
- **Central shared database** — rejected for the reasons in [vision](../vision.md): no app gives its
  data to a central operator.
- **OGC API – Features Part 4** (create/update/delete) — still a draft as of 2026-10, and it models
  record edits, not observations. Readers MAY additionally expose OGC API – Features for GIS tools.
- **OCPI-style bilateral contracts** — the push/credentials ideas are borrowed, but OCPI's
  business-roaming model does not fit.
