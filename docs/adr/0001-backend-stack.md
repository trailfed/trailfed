# ADR-0001: Backend stack — TypeScript + Fedify

**Status:** Accepted
**Date:** 2026-04-22
**Deciders:** @kopaev

## Context

TrailFed needs an ActivityPub server with good federation interop (Mastodon, GoToSocial, Pleroma), quick onboarding for contributors, and a clear upgrade path for real-world OSS adoption. The two mature options are:

- **Go + go-fed/activity** — mature (v1.0 in 2020), minimal Docker footprint, but upstream activity is low.
- **TypeScript + Fedify** — actively developed (2024+), better tooling for the ecosystem, larger contributor pool.

## Decision

Use **TypeScript + [Fedify](https://fedify.dev/)** on Node.js for the reference server. The federation layer is built on Fedify's ActivityPub primitives; the application layer (REST API, OSM import, moderation queue) is plain TypeScript.

## Consequences

**Positive**
- Active upstream library with frequent releases.
- Large JS/TS contributor pool, especially in geo/maps ecosystem (Turf, MapLibre, etc).
- Shared language with the SvelteKit frontend simplifies the monorepo.
- Fedify handles HTTP Signatures, WebFinger, NodeInfo out of the box.

**Negative**
- Larger runtime footprint than Go (Node.js ~60 MB base vs ~20 MB for Go binary).
- Slight performance penalty for CPU-bound tasks; acceptable for federation workloads which are I/O-bound.
- TypeScript strictness discipline requires maintainer enforcement.

**Neutral**
- Docker image size is controllable with multi-stage builds and pnpm deploy.

## Alternatives considered

- **Go + go-fed/activity** — rejected: upstream slowed since 2022, smaller OSS contributor pool in the travel-tech niche, higher barrier to entry.
- **Rust + ActivityPub-federation-rust** — rejected: excellent ecosystem (Lemmy uses it), but contributor pool is narrower and iteration speed suffers during Phase 0–2.
- **Elixir + ActivityPub library (Pleroma-style)** — rejected: niche language, hard to onboard contributors.

## References

- [Fedify homepage](https://fedify.dev/)
- [go-fed/activity](https://github.com/go-fed/activity) — maintained but quiet
- [docs/architecture/stack.md](../architecture/stack.md) for full stack rationale
