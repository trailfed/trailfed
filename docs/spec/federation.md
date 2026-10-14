---
title: ActivityPub Bridge (optional profile)
version: 0.2
status: draft
updated: 2026-10-14
---

# 06. ActivityPub Bridge

> **Changed in v0.2.** In v0.1 ActivityPub was _the_ federation protocol. Since
> [ADR-0010](../adr/0010-sync-protocol-first.md) the sync channel between apps is the
> [core protocol](core.md) (entries + feed + shared status rule). ActivityPub is an **optional
> bridge**: a participant may announce its entries to the Fediverse so that Mastodon users see new
> spots and closures. The bridge is never used to decide a place's status.

## Why ActivityPub is not the sync channel

- No standard backfill: a new participant cannot fetch the full history.
- Deliveries that fail are lost; there is no cursor to resume from.
- It is built around a social graph (actors, follows) that place sync does not need.
- Mastodon and most servers ignore `Place` objects anyway.

## What the bridge does

A participant that enables the bridge runs one service actor, e.g.
`https://openvan.camp/trailfed/actor` (type `Service`), discoverable via WebFinger
(`acct:spots@openvan.camp`). Fediverse users follow it. For each of its own **core entries** it
publishes an ActivityStreams activity:

| Core entry | ActivityPub |
|---|---|
| `place` | `Create` of a `Note` with a `location` (`Place` with `latitude`/`longitude`) and a link to the place page |
| `observation`, `access` (closed / restricted) | `Create` of a `Note` "Reported closed: …" with `location` and `trailfed:entry` = entry id |
| `observation`, `review` | `Create` of a `Note` with `location` |
| `observation`, `photo` | `Create` of an `Image` with `location` |
| `retraction` | `Delete` of the corresponding object |

Every object carries `trailfed:entry` (the core entry id) and `attributedTo` the service actor, so
a TrailFed-aware reader can always go back to the authoritative core entry in the participant's
feed.

Inbound ActivityPub (replies, likes) MAY be shown by the participant but MUST NOT be turned into
core observations automatically.

## Wire details

- Namespace for extension terms: `https://trailfed.org/ns/v1` (`trailfed:entry`).
- HTTP Signatures: legacy Cavage-style `Signature` header for Mastodon/GoToSocial interop; RFC 9421
  where peers support it. Fedify handles both (see [ADR-0009](../adr/0009-lego-stack-rule.md)).
- NodeInfo MAY advertise `metadata.trailfed = { "core": "0.2", "feed": "<feed url>" }` so that
  Fediverse-side tools can find the core feed.

## Reference server (v0.1, frozen)

The reference server in `server/` implements the v0.1 experiment and is kept as a demo:

- Actor persistence, WebFinger, NodeInfo, registration (argon2id);
- signed inbox/outbox via Fedify, `Follow` → `Accept`;
- `Create Place` round-trip between two instances (`federation/e2e.test.ts`);
- domain block-list and `Flag` moderation queue.

Its accepted v0.1 shape, for reference:

```json
{
  "@context": "https://www.w3.org/ns/activitystreams",
  "type": "Create",
  "actor": "https://camp.trailfed.org/actors/stub",
  "to": ["https://remote.example/actors/bob"],
  "object": {
    "type": "Place",
    "name": "Kyrenia Harbour Camp",
    "category": "camp_site",
    "longitude": 33.3178,
    "latitude": 35.3403
  }
}
```

## Deprecated v0.1 extensions

| v0.1 term | Status in v0.2 | Replacement |
|---|---|---|
| `trailfed:qualityTier` (set by sender) | Deprecated | Derived by every reader: [status resolution](status-resolution.md) (`status`, `last_confirmed`, `stale`) |
| `trailfed:amenities` | Deprecated | OSM-style `tags` on `place` + `attribute` observations ([core §7](core.md#7-vocabulary)) |
| `trailfed:access.price_eur` | **Removed** | `attribute` `charge` = `{ amount, currency, unit }` in local currency — a pre-converted price goes stale with the exchange rate |
| `trailfed:Merge` to a moderation queue | Deprecated | `link` entries (`same_as` / `not_same`) with a deterministic canonical URI ([core §6](core.md#6-identity-and-duplicates)) |
| `trailfed:TravelTrack`, `LiveBroadcast` | Out of scope | — |
| Peer `trusted` / `graylist` / `blocklist` | Kept, renamed | `trusted` / `review` / `blocked` ([core §8](core.md#8-trust)) |
