# Changelog

All notable changes to TrailFed will be documented here. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioning: [SemVer](https://semver.org/).

## [Unreleased] — Phase 0 scaffold

### Added
- Monorepo layout (pnpm workspaces) with `server/` (Fedify + Hono) and `web/` (SvelteKit + MapLibre + PMTiles).
- Docker Compose dev stack: PostgreSQL 16 + PostGIS 3.4, Centrifugo v6, server, web, Caddy reverse proxy.
- Governance: AGPL-3.0 license, Contributor Covenant 2.1, CONTRIBUTING (DCO sign-off, no CLA), SECURITY policy (90-day coordinated disclosure), GOVERNANCE model (BDFL → Maintainer Council).
- Specification docs ported and adapted from the internal RFC drafts: vision, positioning, architecture overview, tech stack, federation spec, OSM integration, privacy model, roadmap, funding, risks.
- ADRs 0001–0008 covering backend stack (TypeScript + Fedify), runtime (Node 20 LTS), frontend (SvelteKit + MapLibre + PMTiles), database (Postgres 16 + PostGIS), license (AGPL-3.0-or-later), real-time (Centrifugo v6), monorepo (pnpm), and geocoding (deferred/pluggable).
- CI workflows: lint/typecheck/test + multi-arch Docker build, DCO check, release pipeline publishing images to GHCR on `v*` tags.
- `verify/name-checks.md` — final project name selected (`trailfed`) after full channel availability audit.
