# ADR-0003: Frontend — SvelteKit + MapLibre GL JS + PMTiles

**Status:** Accepted
**Date:** 2026-04-22
**Deciders:** @kopaev

## Context

TrailFed is a map-first product. The frontend needs:

- fast initial render (SSR) with progressive enhancement to a rich interactive map
- small bundle size (many users will be mobile on thin connections while travelling)
- good ergonomics for contributors
- no lock-in to proprietary map APIs (Google, Mapbox)

## Decision

- **Framework:** [SvelteKit](https://kit.svelte.dev/) with SSR and client-side hydration.
- **Map library:** [MapLibre GL JS](https://maplibre.org/) — Apache/BSD-licensed fork of Mapbox GL.
- **Tiles:** [PMTiles](https://protomaps.com/) — single-file tile format served over HTTP range requests from the server (or CDN).
- **Styling:** Tailwind CSS v4 utility-first.

## Consequences

**Positive**
- Smaller bundles than React/Next (Svelte compiled output is leaner).
- No proprietary map API costs; PMTiles can be self-hosted from a single file (regional extract ~1–5 GB, global ~120 GB).
- MapLibre community is healthy and governance-transparent.
- SSR + hydration gives us good SEO for POI pages and fast first paint.

**Negative**
- SvelteKit contributor pool is smaller than React/Next; documentation burden falls on us.
- MapLibre has less paid tooling than Mapbox; we cover the gaps ourselves.

**Neutral**
- Tiles can later be swapped for MBTiles or XYZ tile servers if needed.

## Alternatives considered

- **Next.js + React** — rejected: larger bundle, heavier stack for a map-first UI.
- **Astro + islands** — rejected: good for content sites, but interactive map-centric UIs are better served by a full reactive framework.
- **Leaflet** instead of MapLibre — rejected: raster/DOM-based, can't match vector-tile performance on dense POI views.

## References

- [MapLibre GL JS](https://github.com/maplibre/maplibre-gl-js)
- [Protomaps PMTiles](https://github.com/protomaps/PMTiles)
- [docs/architecture/stack.md](../architecture/stack.md)
