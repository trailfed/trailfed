---
title: TrailFed Core Protocol
version: 0.2
status: draft
updated: 2026-10-14
---

# TrailFed Core Protocol v0.2

The core protocol lets independent travel apps keep **one shared, current picture of places**
(campsites, overnight spots, water, dump stations…) while each app keeps its own users, UI and
database.

The test of the protocol is one sentence:

> A traveller marks a spot as closed in app A. Within minutes apps B and C show the same spot as
> closed — and all three show the **same** status, for the same reason, with credit to app A.

The key words MUST, SHOULD and MAY are used as in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119).

## 1. Design principles

1. **Exchange facts, not records.** Participants never overwrite each other's data. They publish
   _observations_ ("contributor X of app A saw the barrier closed at 09:20") that are only ever
   appended. A place's current state is _derived_ from its observations.
2. **Same inputs → same output.** How a status is derived is part of the protocol
   ([status-resolution.md](status-resolution.md)) and pinned by test vectors. Two participants that
   hold the same observations MUST show the same status.
3. **Every participant owns its data.** An app publishes only what it chooses to publish, under
   the licence it chooses, and can leave at any time.
4. **Catch-up is not optional.** A new participant MUST be able to fetch the full history, and a
   participant that was offline for a week MUST be able to resume without losing anything.
5. **OpenStreetMap is the base layer.** Category vocabulary and attribute keys follow OSM tagging;
   an OSM element reference is the strongest identity signal for a place.
6. **Small enough to implement in a week** in any stack (PHP, Python, Go, TypeScript…). No
   framework, no social graph, no required server software.

## 2. Roles

| Role | Must implement |
|---|---|
| **Reader** | Fetch feeds of other participants, validate entries, apply the status rule, show attribution. |
| **Publisher** | Expose a discovery document and a feed of its own entries. |
| **Full participant** | Reader + Publisher + a push inbox. |

The protocol has no central server. Participants are peers; a participant polls the feeds of the
participants it chooses to trust (see §8).

## 3. Discovery

Each Publisher serves `GET /.well-known/trailfed` (JSON, `Content-Type: application/json`):

```json
{
  "protocol": "trailfed",
  "version": "0.2",
  "participant": {
    "name": "OpenVan.camp",
    "url": "https://openvan.camp",
    "contact": "mailto:hello@openvan.camp"
  },
  "feed": "https://openvan.camp/trailfed/feed",
  "inbox": "https://openvan.camp/trailfed/inbox",
  "keys": [
    { "kid": "2026-10", "kty": "OKP", "crv": "Ed25519", "x": "11qYAYKxCrfVS_7TyWQHOg7hcvPapiMlrwIaaPcHURo" }
  ],
  "default_license": "CC-BY-4.0",
  "roles": ["reader", "publisher", "inbox"]
}
```

- `inbox` and `keys` are required only for Full participants.
- The participant identifier is the **origin** of `participant.url` (`https://openvan.camp`).

## 4. Entries

Everything a participant publishes is an **entry**. Entries are immutable: once published, an entry
is never changed. Corrections are new entries; withdrawals are `retraction` entries.

Common envelope (all entry types):

| Field | Req. | Description |
|---|---|---|
| `id` | MUST | Absolute HTTPS URI on the publisher's origin. Globally unique, never reused. |
| `type` | MUST | `place`, `observation`, `link` or `retraction`. |
| `recorded_at` | MUST | When the publisher accepted the entry (RFC 3339, UTC). |
| `license` | MUST | SPDX identifier: `CC0-1.0`, `CC-BY-4.0`, `ODbL-1.0`, … |
| `attribution` | SHOULD | `{ "text": "via OpenVan.camp", "url": "https://openvan.camp/..." }` |

JSON Schemas: [schema/entry.schema.json](schema/entry.schema.json).

### 4.1 `place` — a place comes into existence

```json
{
  "id": "https://openvan.camp/trailfed/e/p-48211",
  "type": "place",
  "recorded_at": "2026-10-14T09:00:00Z",
  "license": "ODbL-1.0",
  "attribution": { "text": "© OpenStreetMap contributors, via OpenVan.camp", "url": "https://openvan.camp/maps" },
  "place": "https://openvan.camp/p/48211",
  "geometry": { "lat": 44.0426, "lon": 43.3256 },
  "category": "campsite",
  "name": { "en": "Lake View Camp", "ru": "Кемпинг у озера" },
  "osm": "node/123456789",
  "tags": { "fee": "yes", "drinking_water": "yes", "maxheight": "3.5" },
  "created_at": "2026-10-14T08:55:00Z",
  "contributor": { "id": "c:7f3a9e", "on_site": true }
}
```

- `place` is the place's URI. It MUST be on the publisher's origin. It is the place's identity
  until a `link` merges it with another (§6).
- `geometry` is WGS84. Points only in v0.2.
- `category` MUST be one of the [category vocabulary](#7-vocabulary).
- `tags` use OSM keys and values for static attributes.
- A `place` entry counts as an `access = open` observation by its creator at `created_at` for the
  purpose of status resolution, unless it carries an explicit `access` field.

### 4.2 `observation` — something was seen, reported or confirmed

```json
{
  "id": "https://vanlife.example/trailfed/e/91c2",
  "type": "observation",
  "recorded_at": "2026-10-14T09:21:04Z",
  "license": "CC-BY-4.0",
  "attribution": { "text": "via Example Vanlife App", "url": "https://vanlife.example/spots/552" },
  "place": "https://openvan.camp/p/48211",
  "kind": "access",
  "value": "closed",
  "reason": "barrier",
  "observed_at": "2026-10-14T09:00:00Z",
  "contributor": { "id": "c:3b9f1d", "on_site": true },
  "evidence": [
    { "url": "https://vanlife.example/img/abc.jpg", "license": "CC-BY-4.0" }
  ]
}
```

`kind` values in v0.2:

| `kind` | `value` | Meaning |
|---|---|---|
| `access` | `open`, `closed`, `restricted`, `seasonal_closed` | Can a van stay here now? `restricted` = exists, but overnight/vehicle type not allowed. |
| `confirm` | — | "I was here, it is as described." Counts as `access = open` and refreshes freshness. |
| `attribute` | `{ "key": "...", "value": ... }` | Set an attribute; `value: null` removes it. |
| `review` | `{ "rating": 1-5, "text": { "en": "..." } }` | Review. Rating optional. |
| `photo` | `{ "url": "...", "license": "...", "author": "..." }` | Photo of the place. |

Rules:

- `observed_at` MUST NOT be later than `recorded_at` + 5 minutes. Publishers MAY round
  `observed_at` down to the hour (privacy, see §9).
- `reason` (for `access`) is free-form from a recommended list: `barrier`, `sign`, `police`,
  `closed_business`, `construction`, `flooded`, `other`.
- `evidence` items are links to photos or documents (official decree, sign photo). Evidence makes an
  observation _strong_ in status resolution.
- Prices are an `attribute` with key `charge` and value `{ "amount": 18, "currency": "EUR",
  "unit": "night" }` — **always the local amount and currency**; never pre-converted.

### 4.3 `link` — two place URIs are (or are not) the same place

```json
{
  "id": "https://vanlife.example/trailfed/e/l-77",
  "type": "link",
  "recorded_at": "2026-10-14T09:30:00Z",
  "license": "CC0-1.0",
  "relation": "same_as",
  "a": "https://openvan.camp/p/48211",
  "b": "https://vanlife.example/p/552",
  "basis": "distance_category"
}
```

- `relation`: `same_as` or `not_same`.
- `basis`: `osm_ref`, `distance_category`, `human_review`, `other`.

### 4.4 `retraction` — withdraw an earlier entry

```json
{
  "id": "https://vanlife.example/trailfed/e/r-12",
  "type": "retraction",
  "recorded_at": "2026-10-15T07:00:00Z",
  "license": "CC0-1.0",
  "target": "https://vanlife.example/trailfed/e/91c2",
  "reason": "spam"
}
```

- Only the publisher of an entry may retract it (same origin).
- `reason`: `spam`, `error`, `erasure` (user asked to delete their data), `other`.
- Receivers MUST delete the target entry's content and re-derive affected places. For `erasure`
  they MUST also delete stored copies of evidence they fetched.

## 5. Transport

### 5.1 Feed (pull, required for Publishers)

```
GET {feed}?after={cursor}&limit={n}
```

Response:

```json
{
  "items": [ { "id": "...", "type": "place", "...": "..." } ],
  "next": "opaque-cursor-string",
  "has_more": true
}
```

- Items are in the publisher's **recording order**; that order never changes.
- Without `after` the feed starts from the very first entry (full history / backfill).
- `next` is opaque. A reader stores it and passes it back; passing it again MUST return only
  entries recorded later.
- `limit` defaults to 500, maximum 1000.
- Retracted entries stay in the feed as tombstones: `{ "id": "...", "type": "<original type>",
  "retracted": true }` so readers that join later never see the content.
- Readers SHOULD poll every 1–15 minutes and MUST honour `429` and `Retry-After`.

This is the pattern of [RPDE](https://openactive.io/realtime-paged-data-exchange/) (OpenActive),
simplified.

### 5.2 Push (optional, Full participants)

A Full participant MAY push each new entry to the `inbox` of participants that trust it:

```
POST {inbox}
Content-Type: application/json
Signature-Input: sig1=("@method" "@target-uri" "content-digest");keyid="https://openvan.camp#2026-10";alg="ed25519";created=1760432464
Signature: sig1=:...:
Content-Digest: sha-256=:...:

{ ...entry... }
```

- Signatures follow [RFC 9421](https://www.rfc-editor.org/rfc/rfc9421) with Ed25519; the key is
  resolved through the sender's discovery document.
- Push is a **latency hint**, not the source of truth: a receiver MUST accept the entry only if the
  signature verifies, and MAY re-check it against the sender's feed.
- Receivers respond `202` and process idempotently by `id`.

### 5.3 Authenticity

Entries are authoritative only from their **origin**: an entry whose `id` is on
`https://vanlife.example` is valid only if fetched from that origin's feed or pushed with a valid
signature by that origin. v0.2 participants do not relay each other's entries.

## 6. Identity and duplicates

The same real place will be created in several apps. The protocol resolves this with `link`
entries, not with a central registry.

1. **Same OSM element ⇒ same place.** Two `place` entries with the same `osm` reference are
   `same_as` implicitly; no link entry is needed.
2. **Candidate rule.** A participant SHOULD publish `same_as` when two places of the same category
   are within 50 m, or within 150 m with names that match after normalisation. Otherwise a human
   reviews.
3. **Disagreement.** For each unordered pair `{a, b}`, the most recent link (by `recorded_at`, then
   `id`) across all trusted participants wins.
4. **Canonical URI.** Places connected by `same_as` form a group. The canonical URI of the group is
   the URI of the place entry with the earliest `created_at` (tie: lexicographically smallest URI).
   Every participant computes the same canonical URI from the same entries.
5. Observations about any URI in a group apply to the whole group.

## 7. Vocabulary

v0.2 categories, mapped to OSM:

| Category | OSM tagging |
|---|---|
| `campsite` | `tourism=camp_site` |
| `caravan_site` | `tourism=caravan_site` |
| `overnight_parking` | `amenity=parking` + `motorhome=yes` |
| `informal_spot` | _no OSM equivalent — informal / wild overnight spot_ |
| `drinking_water` | `amenity=drinking_water` |
| `dump_station` | `amenity=sanitary_dump_station` |
| `toilets` | `amenity=toilets` |
| `shower` | `amenity=shower` |
| `fuel` | `amenity=fuel` |
| `lpg` | `amenity=fuel` + `fuel:lpg=yes` |
| `laundry` | `shop=laundry` |
| `repair` | `shop=car_repair` |

Attribute keys follow OSM where a key exists (`fee`, `maxheight`, `maxlength`, `drinking_water`,
`toilets`, `shower`, `power_supply`, `internet_access`, `dog`, `opening_hours`). TrailFed-only keys
use the `tf:` prefix (`tf:overnight` = `yes`/`no`/`tolerated`, `tf:surface_level` = `flat`/`slope`).

Attributes resolve by **latest observation wins** (`observed_at`, then `recorded_at`, then `id`),
ignoring retracted entries.

## 8. Trust

Each participant keeps its own list of participants it reads from:

- **trusted** — entries applied automatically;
- **review** — entries queued for a moderator before they count;
- **blocked** — feed not read; entries already stored from it are excluded.

Status resolution runs over the observations a participant accepts. Participants with the same
trust lists therefore show identical results; a participant that blocks a spammer will legitimately
differ from one that does not. This is the only allowed source of divergence.

## 9. Privacy

- `contributor.id` MUST be a pseudonym and MUST NOT be an email, username or account number.
- `contributor.id` SHOULD be **different per place**: `HMAC(secret, user_id + canonical_place_uri)`.
  Status resolution only needs to know that two observations _of the same place_ come from different
  people; a per-place pseudonym gives that without letting anyone stitch a traveller's route across
  places.
- Publishers MAY round `observed_at` down to the hour and MAY delay publishing by up to an hour.
- Right to erasure: the publisher knows which entries belong to the user and publishes `retraction`
  entries with `reason: erasure` for all of them.
- Live location, check-ins and travel tracks are **out of scope** of the core protocol.

## 10. Licensing and attribution

- Each entry carries its own licence. A participant MUST publish only data it has the right to
  publish. Data scraped or copied from closed platforms MUST NOT be published.
- Places derived from OpenStreetMap MUST be published as `ODbL-1.0` with OSM attribution.
- A reader that displays an entry MUST show its attribution (e.g. "reported via Example Vanlife
  App, 14 Oct") with the link, where the entry is shown.
- Participants SHOULD prefer `CC-BY-4.0` for their own observations so that the shared pool stays
  easy to combine.

## 11. Versioning and conformance

- `version` in discovery is `MAJOR.MINOR`. Readers MUST ignore unknown fields and unknown `kind`
  values; this is how minor versions add features.
- A participant claims conformance by passing the test vectors in [vectors/](vectors/) with its own
  implementation of [status resolution](status-resolution.md).
- The reference implementation of status resolution lives in
  [`server/src/protocol/status.ts`](../../server/src/protocol/status.ts).

## 12. Out of scope in v0.2 (on purpose)

Social timelines, follows, check-ins, GPX tracks, live location, bookings, routing, relays/hubs
between participants, and polygon geometries. The optional [ActivityPub bridge](federation.md)
can announce entries to the Fediverse but is not a sync channel.
