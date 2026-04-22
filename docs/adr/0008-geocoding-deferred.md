# ADR-0008: Self-hosted Nominatim/OSRM is optional

**Status:** Accepted (Deferred feature)
**Date:** 2026-04-22
**Deciders:** @kopaev

## Context

Users expect two OSM-adjacent services:

- **Geocoding** (address ↔ coordinates) via [Nominatim](https://nominatim.org/).
- **Routing** (drive/walk/bike time) via [OSRM](http://project-osrm.org/) or [Valhalla](https://valhalla.github.io/valhalla/).

Running a full-planet Nominatim requires ~1 TB disk and ~128 GB RAM — unreasonable for a self-hosted personal instance.

## Decision

- **Not included in the default Docker Compose stack.**
- TrailFed server has a pluggable `GeocoderAdapter` and `RouterAdapter`. Default implementations call the TrailFed public demo instance; operators can override to point at their own Nominatim/OSRM or a third-party (MapTiler, Stadia Maps, Photon).
- We ship regional self-host guides in `docs/deployment/geocoding.md` (written in Phase 2): country extracts typically fit in <20 GB RAM.

## Consequences

**Positive**
- `docker compose up` stays fast and small (Phase 0 target: <2 GB RAM total).
- Operators with serious traffic can self-host; small instances can use a shared endpoint.

**Negative**
- Default configuration relies on an external endpoint; operators serious about privacy need to swap it.
- Two adapters to maintain, but each is thin.

**Neutral**
- If a community-run "Fediverse geocoder" emerges (analogous to how some fediverse services share relays), we can target it.

## Alternatives considered

- **Bundle Nominatim by default** — rejected: resource footprint kills onboarding.
- **Require an external API key at install time** — rejected: makes `docker compose up` fail out of the box.

## References

- [Nominatim installation](https://nominatim.org/release-docs/latest/admin/Installation/)
- [OSRM docker](https://github.com/Project-OSRM/osrm-backend)
- [Photon (Elasticsearch-based)](https://photon.komoot.io/)
