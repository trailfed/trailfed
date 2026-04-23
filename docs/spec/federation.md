---
title: Federation Protocol (ActivityPub Extensions)
version: 0.1
status: draft
updated: 2026-04-22
---

# 06. Federation Protocol

## Foundation: W3C ActivityPub

TrailFed uses [ActivityPub](https://www.w3.org/TR/activitypub/) as its base protocol. We **do not invent our own protocol** — we implement the W3C standard and extend it minimally.

This means partial compatibility with:
- Mastodon, Pleroma/Akkoma, GoToSocial, Pixelfed for actors, follows, notes and basic federation
- Mobilizon, Friendica, Hubzilla
- places.pub (Social Web Foundation) as a read-only AS2 Place reference
- Future geo-aware ActivityPub implementations

Important: Mastodon does not become a full POI client. It handles `Note`/`Question` as first-class; `Place`, `Arrive`, `Leave`, `Travel` may be processed as generic objects on a best-effort basis, or ignored. Full POI/check-in federation requires a TrailFed-compatible peer.

## AS Vocabulary types used as-is

From [Activity Streams 2.0 Vocabulary](https://www.w3.org/TR/activitystreams-vocabulary/):

### Objects
- **`Person`** (Actor) — user
- **`Place`** — POI (campsite, fuel station, dump station, ...)
- **`Note`** — social post
- **`Image`** — photo (attached to a POI or Note)
- **`Document`** — GPX track file

### Activities
- **`Create`** — create a POI, publish a post
- **`Update`** — update a POI
- **`Delete`** — soft-delete
- **`Follow`** — follow a user
- **`Like`** — like
- **`Announce`** — reshare (boost)
- **`Arrive`** — check-in at a POI (defined by W3C!)
- **`Leave`** — check-out from a POI (defined by W3C!)
- **`Travel`** — in transit (route between two Places)

**Key point:** `Arrive`, `Leave`, `Travel` are standard W3C activities. We use them as-is rather than inventing our own equivalents.

## TrailFed extension namespace

Namespace: `https://trailfed.org/ns/v1`

Extensions are kept minimal — only where the AS Vocabulary does not cover travel-specific needs.

### Extension 1: `QualityTier`

Property on `Place`:

```json
{
  "@context": ["https://www.w3.org/ns/activitystreams", "https://trailfed.org/ns/v1"],
  "type": "Place",
  "trailfed:qualityTier": 2
}
```

Values:
- `0` — unverified (auto-imported from OSM)
- `1` — community-reported (1+ user check-in)
- `2` — verified (moderator or 3+ independent check-ins)
- `3` — partner-verified (tourism board, SLA data)

### Extension 2: `AmenityBundle`

Property on `Place`:

```json
{
  "trailfed:amenities": {
    "drinking_water": true,
    "electricity": false,
    "showers": true,
    "toilets": true,
    "dump_station": false,
    "wifi": false,
    "pets_allowed": true,
    "van_accessible": true,
    "height_limit_m": 3.2
  },
  "trailfed:access": {
    "fee": "yes",
    "price_eur": 18.00,
    "booking_required": false,
    "opening_months": [4,5,6,7,8,9,10],
    "opening_hours": "08:00-22:00"
  }
}
```

### Extension 3: `TravelTrack` (extends `Travel`)

For publishing GPX tracks:

```json
{
  "type": ["Travel", "trailfed:TravelTrack"],
  "actor": "https://instance.com/actors/alice",
  "origin": "https://instance.com/places/start-uuid",
  "target": "https://instance.com/places/end-uuid",
  "trailfed:polyline": "gfo}FhqhkVa@hDaHzM...",
  "trailfed:distance_km": 124.5,
  "trailfed:duration_minutes": 180,
  "trailfed:track_type": "road",
  "startTime": "2026-04-22T08:00:00Z",
  "endTime": "2026-04-22T11:00:00Z"
}
```

### Extension 4: `LiveBroadcast` (NOT federated — WebSocket only)

**Critically important:** live location is **not** a federated activity. It is an ephemeral WebSocket signal. We define the type only for documentation purposes — to make it clear that this is a special case.

## GeoSocial compatibility profile

TrailFed peers advertise supported geo capabilities in NodeInfo. This reduces protocol fragmentation and lets Mastodon-compatible social federation coexist alongside POI federation.

### Capabilities

```json
{
  "metadata": {
    "trailfed": {
      "schema_version": "1.0",
      "places": true,
      "place_reviews": true,
      "checkins": true,
      "travel_tracks": true,
      "live_location": false,
      "imports": ["osm", "places.pub"],
      "licenses": ["ODbL-1.0", "CC-BY-4.0"]
    }
  }
}
```

### `Place` MUST fields

- `id`
- `type: "Place"` or `["Place", "geojson:Feature"]`
- `name` or `nameMap`
- `latitude` and `longitude`, or `geojson:hasGeometry`
- source/license metadata: `dcterms:source`, `dcterms:license`, or `trailfed:source`

### `Place` SHOULD fields

- `summary`
- `tag` or `trailfed:category`
- `trailfed:amenities`
- `trailfed:qualityTier`
- `trailfed:sourceConfidence`
- `attributedTo`

### Phase 1 minimum accepted shape

The reference instance currently accepts the following minimal `Create Place` — wider `Place` fields are ignored by the Phase 1 persister but retained in `place_sources.fields`:

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

Server behaviour on receipt:

1. HTTP Signature verified (draft-cavage-12, rsa-sha256 + `Digest: SHA-256`).
2. The `Create` dispatcher invokes the Place handler iff `object.type === "Place"` and `category` + `longitude` + `latitude` are present.
3. Row inserted into `places` (`source_type = "activitypub"`, `origin_instance = host(actor)`). The original JSON-LD object is stored verbatim in `place_sources.fields` so future code can re-read non-Phase-1 fields without rewriting this endpoint.
4. Reinsert by `uri` is a no-op (idempotent).

Phase 1 `category` values recognised by the map layer: `camp_site`, `fuel`, `sanitary_dump_station` — matches the OSM importer taxonomy.

## Actor discovery and identity

### WebFinger (RFC 7033)

```
GET /.well-known/webfinger?resource=acct:alice@trailfed.example.com

Response:
{
  "subject": "acct:alice@trailfed.example.com",
  "aliases": ["https://trailfed.example.com/actors/alice"],
  "links": [
    {
      "rel": "self",
      "type": "application/activity+json",
      "href": "https://trailfed.example.com/actors/alice"
    }
  ]
}
```

### Actor object

```json
{
  "@context": [
    "https://www.w3.org/ns/activitystreams",
    "https://w3id.org/security/v1",
    "https://trailfed.org/ns/v1"
  ],
  "type": "Person",
  "id": "https://trailfed.example.com/actors/alice",
  "preferredUsername": "alice",
  "inbox": "https://trailfed.example.com/actors/alice/inbox",
  "outbox": "https://trailfed.example.com/actors/alice/outbox",
  "followers": "https://trailfed.example.com/actors/alice/followers",
  "following": "https://trailfed.example.com/actors/alice/following",
  "publicKey": {
    "id": "https://trailfed.example.com/actors/alice#main-key",
    "owner": "https://trailfed.example.com/actors/alice",
    "publicKeyPem": "-----BEGIN PUBLIC KEY-----\n..."
  },
  "trailfed:vehicle": "motorhome",
  "trailfed:shareLocation": false
}
```

### NodeInfo (instance metadata)

```
GET /.well-known/nodeinfo

Response:
{
  "links": [
    {
      "rel": "http://nodeinfo.diaspora.software/ns/schema/2.1",
      "href": "https://trailfed.example.com/nodeinfo/2.1"
    }
  ]
}

GET /nodeinfo/2.1
{
  "version": "2.1",
  "software": {
    "name": "trailfed",
    "version": "0.1.0",
    "repository": "https://github.com/trailfed/core"
  },
  "protocols": ["activitypub"],
  "usage": {
    "users": {"total": 42, "activeMonth": 30}
  },
  "openRegistrations": true,
  "metadata": {
    "trailfed": {
      "federates_places": true,
      "federates_checkins": true,
      "federates_location": false,
      "schema_version": "1.0"
    }
  }
}
```

## Authentication: HTTP Signatures

Interop reality: Fediverse S2S compatibility today requires the legacy Cavage-style HTTP Signatures (`Signature` header), because Mastodon/GoToSocial/Pleroma/Akkoma mostly use that profile. [RFC 9421 HTTP Message Signatures](https://www.rfc-editor.org/rfc/rfc9421.html) is the current IETF Proposed Standard, but is not yet a baseline for Fediverse interop.

TrailFed should:
1. **MUST support:** legacy `Signature` header compatible with Mastodon/GoToSocial.
2. **SHOULD support:** RFC 9421 `Signature-Input`/`Signature` for future peers.
3. **MUST sign:** POST inbox deliveries.
4. **SHOULD sign:** GET requests to ActivityPub resources for secure/authorized fetch peers.

Every S2S POST to `/inbox` is signed:

```
POST /actors/alice/inbox HTTP/1.1
Host: trailfed.example.com
Date: Wed, 22 Apr 2026 12:00:00 GMT
Digest: SHA-256=X48E9qOokqqrvdts8nOJRJN3OWDUoyWxBf7kbu9DBPE=
Content-Type: application/activity+json
Signature: keyId="https://other-instance.com/actors/bob#main-key",
           algorithm="rsa-sha256",
           headers="(request-target) host date digest",
           signature="qdx+H7PHHDZg..."

{...JSON-LD Activity...}
```

Verification:
1. Fetch the public key at `keyId`
2. Reconstruct the signing string
3. Verify the signature
4. Check `Date` is within ±30 seconds
5. Check `Digest` matches the body

## Trust model

Each instance maintains a `peers` table with trust levels:

### `trusted` — Allowlist
- Activities are applied automatically
- Place creates skip the moderation queue
- Typically: friend instances, vetted partners

### `graylist` — Default
- Activities go into the moderation queue
- Admin approves manually for the first N activities
- After N successful ones with no flags, auto-apply may be enabled

### `blocklist` — Blocklist
- All activities are dropped
- Outgoing activities to this peer are NOT sent
- Equivalent to Mastodon defederation

### Reputation score
Local (non-federated) score per peer:
- `+1` for each valid activity applied
- `-5` for flagged content from the peer
- `-20` for spam patterns (many creates in a short window)
- Admin can adjust manually

## Conflict resolution

### Geospatial fingerprint for dedup

When a `Create{Place}` arrives, we check for duplicates:

```
candidate_score =
    distance_score(lat/lng radius) +
    category_score(mapped_category) +
    normalized_name_score +
    osm_id_exact_match +
    source_confidence +
    address_phone_website_similarity
```

A simple hash such as `round(lat,4)+name+category` is acceptable only as a fast prefilter, not as the sole dedup mechanism.

If the candidate score exceeds the threshold:
- Same origin instance → treat as Update
- Different origin → propose a Merge activity to the admin moderation queue

### Merge activity

```json
{
  "type": "trailfed:Merge",
  "actor": "...",
  "object": "https://instance-a.com/places/foo",   -- source (will be marked as alias)
  "target": "https://instance-b.com/places/bar"    -- canonical
}
```

Each instance **decides for itself** whether to apply a Merge. It may be applied:
- Automatically if the source was from a trusted peer
- After admin review otherwise

After applying: `places.canonical_uri` points to the target, and requests to `uri` redirect.

## Live location — why it is NOT federated

Live location (real-time GPS stream) is **not federated via ActivityPub**. Reasons:

1. **Privacy** — federation means sending data to N peers. For live location, this means an order of magnitude more surface area for leaks.
2. **Performance** — ActivityPub's eventual consistency does not fit real-time (latency can be minutes).
3. **Scope** — live location is session data, not a historical record.

Instead:
- Live location broadcasts ONLY via WebSocket (Centrifugo) on the same instance
- No public geohash channels in MVP
- Delivery is restricted to an explicit allowlist, not "all followers"
- For a federated "locations nearby" experience — opt-in **snapshot** periodic publish as a `Travel` activity (every 30 min, at CITY or COUNTRY precision)
- A snapshot is a persistent record, not a stream

## places.pub integration

[places.pub](https://places.pub/) is an AS2/ActivityPub-compatible wrapper over OSM Places. It publishes Place objects for OSM POIs with URLs of the form `https://places.pub/{node|way|relation}/{id}`.

Our integration:
- TrailFed fetches `https://places.pub/{osm_type}/{osm_id}` to obtain a Place object
- We store it as an external Place reference
- Cross-referenced via `trailfed:osm_id`

We do not "federate" in the full sense — places.pub is read-only, the objects are not Actors, and they have no inbox/outbox. We do not send them activities; we consume their data as canonical AS2 Place references.

## Example of a full federation flow

**Scenario:** Alice on instance-a creates a POI "Playa del Sol campsite".

1. Alice → `POST /api/v1/places` (REST, local API)
2. instance-a creates the Place object and an Activity{Create, object: Place}
3. instance-a fans out:
   - For each follower of Alice on other instances:
     - Build a signed HTTP POST to their inbox
     - Payload: JSON-LD Activity
   - For `places.pub` (if configured) — log only, no push
4. instance-b receives POST `/actors/bob/inbox`
5. Verify signature, parse Activity
6. Fingerprint check — new POI, no duplicate
7. Insert Place locally (if trusted peer or after passing moderation)
8. Notify Bob via WebSocket "place:new_in_area"
9. instance-a receives 202 Accepted

Total latency: < 5 seconds for 10 subscribers.

---

## Fact-check questions for agents

1. **W3C AS Vocabulary** — confirm that `Arrive`, `Leave`, `Travel` are defined in the standard (check https://www.w3.org/TR/activitystreams-vocabulary/)
2. **RFC 9421 vs legacy Cavage** — confirm exact compatibility expectations for Mastodon/GoToSocial/Pleroma/Akkoma.
3. **WebFinger RFC 7033** — is the RFC number correct?
4. **NodeInfo schema** — is 2.1 the current version?
5. **places.pub API** — what is their real endpoint schema (check their repo)?
6. **JSON-LD @context** — is extending via a custom namespace done correctly?
7. **Mastodon compatibility** — which `Place`/`Arrive` payloads does Mastodon accept on a best-effort basis, and which does it ignore?
8. **HTTP Signatures digest** — is SHA-256 required, or is SHA-512 acceptable?
9. **Geohash5 precision** — is it really ~4.9 km × 4.9 km?
10. **bridgy.fed** — does such a project exist for an ActivityPub↔ATProto bridge?
