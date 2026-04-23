# Changelog

All notable changes to TrailFed will be documented here. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioning: [SemVer](https://semver.org/).

## [Unreleased] — Phase 0 scaffold

### Added
- Local actors now live in the `actors` table — keys are persisted, and a `stub` row is seeded on first boot (when `DATABASE_URL` and `PUBLIC_ORIGIN` are set). `/actors/:username`, `/actors/:username/inbox` and WebFinger resolve arbitrary registered usernames from the DB; unknown usernames 404.
- Inbox now verifies inbound ActivityPub deliveries with HTTP Signatures (draft-cavage-12, rsa-sha256 + `Digest: SHA-256`) before routing them through a typed activity dispatcher — unsigned, bad-signature and tampered-body deliveries are rejected with 401. Groundwork for Phase 1 `Follow` / `Accept` handling.
- Database schema and migration runner (Drizzle ORM) for the nine core tables — actors, places, place_sources, activities, notes, checkins, follows, peers, live_locations — including PostGIS `geography(Point, 4326)` columns and spatial GIST indexes. Operators apply migrations with `pnpm --filter @trailfed/server migrate` before first start.
- First real federation endpoint — the reference instance now publishes a discoverable ActivityPub `Person` at `/actors/stub` with an RSA public key, and WebFinger resolves `acct:stub@camp.trailfed.org` to it.
- Monorepo layout (pnpm workspaces) with `server/` (Fedify + Hono) and `web/` (SvelteKit + MapLibre + PMTiles).
- Docker Compose dev stack: PostgreSQL 16 + PostGIS 3.4, Centrifugo v6, server, web, Caddy reverse proxy.
- Governance: AGPL-3.0 license, Contributor Covenant 2.1, CONTRIBUTING (DCO sign-off, no CLA), SECURITY policy (90-day coordinated disclosure), GOVERNANCE model (BDFL → Maintainer Council).
- Specification docs ported and adapted from the internal RFC drafts: vision, positioning, architecture overview, tech stack, federation spec, OSM integration, privacy model, roadmap, funding, risks.
- ADRs 0001–0008 covering backend stack (TypeScript + Fedify), runtime (Node 20 LTS), frontend (SvelteKit + MapLibre + PMTiles), database (Postgres 16 + PostGIS), license (AGPL-3.0-or-later), real-time (Centrifugo v6), monorepo (pnpm), and geocoding (deferred/pluggable).
- CI workflows: lint/typecheck/test + multi-arch Docker build, DCO check, release pipeline publishing images to GHCR on `v*` tags.
- `verify/name-checks.md` — final project name selected (`trailfed`) after full channel availability audit.
- `trailfed.org` registered and pointed to the reference server.
- GitHub organization `trailfed` created with three repositories: `trailfed/trailfed` (core), `trailfed/trailfed.org` (landing site source), and `trailfed/.github` (org profile).
- Landing site live at https://trailfed.org — Next.js 15 + Tailwind, deployed via systemd.
- Reference instance live at https://camp.trailfed.org — full docker-compose stack (postgres+PostGIS, centrifugo, server, web, caddy) behind nginx + Let's Encrypt TLS.
- GitHub Actions CI on core repo (`ci.yml`: install, format:check, typecheck, lint, test, docker build) and on landing repo (typecheck + next build) — both green.
- Progress-tracking rule in `CLAUDE.md`: `NEXT_STEPS.md` is the single source of "what's next", `CHANGELOG.md` is the single source of "what's done", Keep-a-Changelog 1.1 format.
- Self-hosted PMTiles basemap: Caddy serves `infra/pmtiles/region.pmtiles` at `/tiles/*` with CORS and byte-range support, and the web frontend loads it via the PMTiles protocol — falling back to the MapLibre demo tiles when no file is present. Cyprus is the reference region for the Phase 0 PoC.
- Dependabot config for npm (pnpm workspace), GitHub Actions, and Docker dependency updates — weekly on Mondays, minor/patch grouped per ecosystem.
- Dependabot auto-merge workflow — approves and enables squash auto-merge on dependabot PRs, so they land automatically once CI is green.
- OSM PBF importer PoC: `pnpm --filter @trailfed/server import-pbf` downloads the Cyprus extract from Geofabrik, filters `tourism=camp_site` / `amenity=fuel` / `amenity=sanitary_dump_station`, and idempotently inserts a sample of POIs into the `places` table with ODbL attribution.

### Changed
- Pull request template now enforces the progress-tracking rule — each PR has checkboxes for updating `NEXT_STEPS.md` and `CHANGELOG.md` (or marking the change as N/A for typo fixes / CI tweaks / dev-dep bumps).
- WebFinger and NodeInfo stubs now honour `PUBLIC_ORIGIN` so federated URLs advertise the public https scheme/host behind the reverse proxy.
- Centrifugo configuration migrated from v5 to v6 schema (top-level secret keys moved under `client.token` and `http_api`).

### Fixed
- Runtime Docker images (`server/`, `web/`) now copy `/app/node_modules` so pnpm symlinks into `.pnpm/…` resolve at runtime; previously the containers failed with `ERR_MODULE_NOT_FOUND`.
- `server/package.json` declares `@hono/node-server`, which is required for `serve()` to start the HTTP listener.
- CI: dropped the redundant `pnpm/action-setup` version input that conflicted with `packageManager` in `package.json`; added `pnpm-lock.yaml` so CI can use cache and lockfile-based installs; added `prettier-plugin-svelte` so `format:check` can parse `.svelte` files; extended `.prettierignore` to keep human-authored prose in `docs/` out of the formatter.
