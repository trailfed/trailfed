---
title: OpenStreetMap Integration
version: 0.1
status: draft
updated: 2026-04-22
---

# 07. OSM Integration

## Philosophy: additive, not replacement

TrailFed **does not replace** OpenStreetMap. OSM is the source of truth for persistent geographic features (roads, campsites, fuel stations). TrailFed adds a layer that OSM does not cover and should not cover:

- Reviews and ratings (OSM does not store "this campsite is good")
- Ephemeral data (seasonality, temporary closures)
- Van-specific options (height limit, van-friendly amenities)
- Free camping spots (OSM does not map illegal/grey zones in some countries)
- Social layer (who has been there recently, tracks)

The model is like iOverlander: OSM for the base, our own overlay for specialty data.

## Three aspects of the integration

### 1. Tiles (vector tiles via Protomaps)

#### Source
[Protomaps Basemaps](https://protomaps.com/) — a project that builds vector tiles from OSM data and publishes them in the PMTiles format.

#### Workflow
1. For production/global operators: download the current full-planet PMTiles build (roughly 120 GB for z0–z15 as of 2026)
2. For the default self-host: make a regional extract or a reduced-maxzoom tileset with `pmtiles extract`
3. Deploy to a local server or S3
4. MapLibre GL JS reads via HTTP range requests through the `pmtiles` protocol plugin

#### Updates
- Protomaps rebuilds tiles roughly monthly
- We pull their updates in cron
- Hot-reload-by-strobing is possible: when a newer PMTiles file is available, clients pick it up

#### Alternatives (in case Protomaps does not fit)
- **OpenMapTiles** — a classic tileserver, requires PostgreSQL + pg_tileserv
- **Tilemaker** — build your own PMTiles from OSM extracts
- **OSMF tile servers** — public, but with fair-use limits (no heavy traffic)

### 2. POI Import (PBF extracts first, Overpass only for small queries)

#### What we import
OSM tags mapped to our categories:

| OSM tag | TrailFed category |
|---|---|
| `tourism=camp_site` | `campsite` |
| `tourism=caravan_site` | `caravan_site` |
| `amenity=camping` (on naturals) | `free_camping` |
| `amenity=drinking_water` | `drinking_water` |
| `amenity=toilets` | `toilets` |
| `amenity=shower` | `shower` |
| `amenity=fuel` | `fuel` |
| `amenity=sanitary_dump_station` | `dump_station` |
| `amenity=parking` + `motorhome=yes` | `overnight_parking` |
| `internet_access=wifi` | `wifi_spot` (if public) |

#### Pipeline for initial seed

For the initial import of a country or region, we do not use the public Overpass as a bulk backend. The right path is:

1. Download a `.osm.pbf` extract from Geofabrik or another OSM mirror.
2. Filter the relevant tags via `osmium tags-filter`, or import into PostGIS/osm2pgsql.
3. Map OSM elements to TrailFed `Place`.
4. Store source/license/attribution in `place_sources`.

Overpass remains useful for small bbox queries, admin previews, delta checks, and developer testing.

```go
// pseudocode
func ImportOsmRegion(bbox Bbox) {
    elements := loadFilteredPbfExtract(region, categories)
    for _, element := range elements {
        place := mapOsmToPlace(element)
        existing := findByOsmId(element.id)
        if existing == nil {
            insertPlace(place)
            federateCreate(place)
        } else if hasChanges(existing, place) {
            updatePlace(existing.id, place)
            federateUpdate(place)
        }
    }
}
```

#### Overpass fair use
- Public Overpass is suitable for small/interactive queries, not for bulk import of a country or continent
- Main overpass-api.de safe-use guideline: <10,000 queries/day and <1 GB/day download
- Sleep 1–5 seconds between queries
- Respect `429 Too Many Requests`
- Do not rely on endpoint rotation as a production strategy; some public instances change status. As of 2026 `overpass.kumi.systems` has moved / is now known as Private.coffee, and `maps.mail.ru` was marked in the OSM wiki as temporarily suspended from 2026-03-16.

#### Initial seed vs periodic sync
- **Initial seed** (one-time, at instance installation):
  - Admin picks regions (countries or custom bbox) in config
  - Full import, minutes to hours depending on scale
- **Periodic sync** (cron, every 1–7 days):
  - Same regions, but with an updated_at > last_sync filter
  - Update only changed places
  - OSM typically changes 0.1–1% per day

### 3. Back-contribution (contribute to OSM) — optional, Phase 4+

#### Concept
When a user notices that a POI in OSM is inaccurate (wrong name, missing amenity), we offer: "Contribute this fix to OSM".

#### How it works
1. User authorizes with OSM via OAuth 2.0 (https://www.openstreetmap.org/oauth2)
2. TrailFed receives a temporary token
3. User edits the POI in the TrailFed UI
4. Submit → two-way:
   - Update in the TrailFed database (instant)
   - Submit a changeset to the OSM API via the user's token (takes 1–5 seconds)

#### What we do NOT contribute back
- Van-specific amenities (the OSM community may consider these out of scope)
- Free camping spots (may violate local laws; OSM reviews legality carefully)
- Review text (OSM does not store subjective data)
- Ephemeral data (seasonal options)

Anything that would create a conflict with the OSM community stays only in the TrailFed layer.

#### OSM attribution

All imported POIs must carry attribution:

```json
{
  "type": "Place",
  "id": "https://instance.com/places/uuid",
  "trailfed:osm_id": 123456,
  "trailfed:osm_type": "node",
  "attribution": "© OpenStreetMap contributors, ODbL 1.0"
}
```

## Geocoding (Nominatim)

### Options for self-hosting

**Option 1: No geocoding** (default for micro-instances)
- User enters coordinates via a map picker
- No server-side infrastructure

**Option 2: Regional Nominatim**
- Download a country extract from Geofabrik
- Set up Nominatim for this region
- Country scale: 1–5 GB disk, 4–8 GB RAM
- Example: Portugal = ~300 MB extract, reasonable

**Option 3: Full-planet Nominatim**
- Full OSM planet import
- As of 2026: about **1 TB disk** and **128 GB RAM strongly recommended**; maintainers explicitly do not recommend less than 64 GB RAM
- Overkill for most instances
- Only for large operators

**Option 4: Public Nominatim proxy**
- Proxy requests to `nominatim.openstreetmap.org`
- Fair use: ≤1 req/sec, proper User-Agent
- Cache responses aggressively
- Suitable for low-traffic instances

We recommend **Option 1 or 4** as defaults. Option 2 is advanced. Option 3 is enterprise.

### API wrapping

TrailFed exposes a unified endpoint:

```
GET /api/v1/geocode?q=Porto, Portugal
  → internally routes to the configured Nominatim backend
  → returns a GeoJSON FeatureCollection

GET /api/v1/geocode/reverse?lat=...&lng=...
  → same
```

## Routing (OSRM)

### What and why
OSRM = Open Source Routing Machine. A self-hostable routing engine that uses OSM data.

### Opt-in config
Default in docker-compose: **off** (requires separate compute).

An admin can enable it:
- Download an OSRM extract for the region (for example, Europe = 20 GB)
- Run the OSRM container
- TrailFed routes `/api/v1/directions` requests → OSRM

### Alternatives
- **Valhalla** — more mature, harder to set up
- **GraphHopper** — Java-based, popular in enterprise
- **OSM.org / OSRM public API** — fair-use limits

## ODbL compliance

OpenStreetMap data is licensed under [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/).

Requirements for us:
1. **Attribution** — every imported POI must indicate its OSM source
2. **Share-Alike** — our derived data is also open (we use ODbL for TrailFed POI data)
3. **Keep Open** — if we modify OSM data, derivatives remain open

We comply by:
- ✅ Attribution in the metadata of every Place
- ✅ Publishing our data under ODbL through API exports
- ✅ Not locking derivative data behind proprietary formats

### Legal side of back-contribution

When a user contributes an edit to OSM:
- The changeset is created under **their** account (user's OAuth token)
- All edits belong to the OSM community
- We have no ownership of contributed data
- Important: attribute `created_by=trailfed` in the changeset tags for analytics

## Community relations (OSM)

### Risks
- The OSM community may perceive us as "leeching" (consume only, no contribution)
- Non-OSM-compatible data (free camping) may create friction

### Mitigation
1. **Public dev blog** — regularly publish OSM diary posts: "we're building X using OSM"
2. **Upstream bugs** — report OSM data issues that we find during import
3. **Commit back to OSM** via user contributions (Phase 4+)
4. **Conference presence** — State of the Map, OSM conferences
5. **No bulk uploads without community approval** — never shovel data into OSM

## iOverlander precedent

iOverlander successfully co-exists with OSM: they import OSM POIs, add their own layer (reviews), and encourage users to contribute back. We follow their model.

Links:
- [iOverlander OSM integration](https://ioverlander.com/osm)
- iOverlander community discussion — no friction with OSM

---

## Fact-check questions for agents

1. **Protomaps planet PMTiles** — exact URL for current builds? Current size of the full planet and regional extracts?
2. **Nominatim full planet** — exact system requirements for the current version (5.x or newer).
3. **Overpass API** — are the rate limits officially documented?
4. **Overpass endpoints** — which public ones still work in 2026, and what is each one's official usage policy?
5. **Geofabrik extracts** — is the Portugal extract really around 300 MB?
6. **OSRM** — minimum requirements for the Europe region?
7. **OSM OAuth 2.0** — is the endpoint and flow correct?
8. **ODbL 1.0** — current license version? Attribution requirements?
9. **iOverlander-OSM integration** — how do they actually do it? Are their practices documented?
10. **OSM changeset tags** — is the `created_by` convention correct?
11. **PBF pipeline:** osmium/osm2pgsql/tilemaker — which minimal importer is fastest to implement for the TrailFed MVP?
12. **ODbL boundary:** how do we correctly separate the OSM-derived database from user reviews/check-ins and non-ODbL content?
