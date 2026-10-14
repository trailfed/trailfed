# ADR-0011: Data licence per entry, attribution required

**Status:** Accepted
**Date:** 2026-10-14
**Deciders:** @kopaev

## Context

v0.1 planned to publish all TrailFed POI data under ODbL. In a protocol between independent apps,
that would force every participant to put its own users' reports under share-alike just to join —
a blocker for adoption. At the same time places derived from OpenStreetMap must stay ODbL.

## Decision

1. Every entry carries its own `license` (SPDX id) and SHOULD carry `attribution`.
2. Places and attributes derived from OSM are published as `ODbL-1.0` with OSM attribution.
3. Participants SHOULD publish their own observations as `CC-BY-4.0`; `CC0-1.0` is allowed; links
   and retractions SHOULD be `CC0-1.0`.
4. A reader MUST show the attribution of an entry wherever it displays it.
5. A participant MUST NOT publish data it has no right to publish, in particular data copied or
   scraped from closed platforms.

## Consequences

- Joining does not force a participant to relicense its data.
- Attribution gives each participant visible credit and links back — a concrete reason to share.
- Readers that combine ODbL places with CC-BY observations must keep the ODbL part open
  (share-alike applies to the OSM-derived database, not to separate CC-BY observations); the exact
  boundary needs review by an OSM licensing expert before 1.0.

## Alternatives considered

- **ODbL for everything** — rejected: blocks participants that do not want share-alike.
- **CC0 for everything** — rejected: incompatible with OSM-derived data and removes the credit that
  motivates participants.
