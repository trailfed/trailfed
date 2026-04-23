# Next Steps

Canonical list of outstanding work, organised by phase. See [`CHANGELOG.md`](CHANGELOG.md) for what's already been delivered. Order within each phase = priority.

Update discipline: tick items as you complete them (`- [ ]` → `- [x]`). Add new items in the appropriate phase rather than creating parallel lists elsewhere. See [CLAUDE.md](CLAUDE.md#отслеживание-прогресса--обязательное-правило) for the rule.

---

## Phase 0 — public scaffold

### Infrastructure & identity

- [x] Register `trailfed.org` (primary domain)
- [x] Create GitHub org `trailfed`
- [x] Push core repo to `github.com/trailfed/trailfed`
- [x] Push landing repo to `github.com/trailfed/trailfed.org`
- [x] Push org profile repo to `github.com/trailfed/.github`
- [x] Branch protection on `main` (1 review required) — both core and landing repos
- [x] Private vulnerability reporting enabled on core repo
- [x] Core labels created (`good-first-issue`, `help-wanted`, `phase-0`, `federation`, `osm`, `security`)
- [x] DNS: `camp.trailfed.org` A record → server
- [x] TLS certificates via Let's Encrypt (`trailfed.org`, `www.trailfed.org`, `camp.trailfed.org`)
- [x] nginx reverse-proxy vhosts for landing and reference instance
- [x] Landing site live at https://trailfed.org (Next.js 15 + Tailwind, systemd-managed)
- [x] Reference instance live at https://camp.trailfed.org (docker-compose stack healthy)
- [ ] Register defensive domains: `trailfed.com`, `trailfed.dev`
- [ ] Email forwarders on `trailfed.org`:
    - [ ] `conduct@` (referenced in CODE_OF_CONDUCT.md)
    - [ ] `security@` (referenced in SECURITY.md)
    - [ ] `info@` (used as GitHub org contact)

### Social identities (reserve before squatters)

- [ ] Mastodon — `@trailfed@fosstodon.org` (or chosen server)
- [ ] Bluesky — `trailfed.bsky.social`; later set DID to custom domain on `trailfed.org`
- [ ] Matrix — community room `#trailfed:matrix.org`
- [ ] X/Twitter — `@trailfed_org`

### Code — completeness of the Phase 0 scaffold

- [x] Monorepo (pnpm workspaces: `server/`, `web/`)
- [x] Docker Compose dev stack (Postgres/PostGIS, Centrifugo v6, server, web, Caddy)
- [x] Server stub: `/`, `/healthz`, `/.well-known/webfinger`, `/nodeinfo/2.0`
- [x] Web stub: SvelteKit page rendering with MapLibre
- [x] CI workflow on core repo (lint, typecheck, format, test, docker build) — green
- [x] CI workflow on landing repo (typecheck + build) — green
- [x] DCO workflow on core repo
- [x] Release workflow publishing to GHCR on version tags
- [x] **Phase 0 exit spike — Fedify Actor**: replace the hardcoded WebFinger/NodeInfo JSON with a real `@fedify/fedify` Actor object (Person with `@context`, public key, inbox). File: `server/src/federation/actor.ts`. Done when `/actors/stub` returns a valid ActivityPub Actor JSON-LD.
- [x] **Phase 0 exit spike — Drizzle schema & migrations**: translate the schema in `docs/architecture/overview.md` to Drizzle table defs under `server/src/db/schema.ts`, add migration runner, wire into server boot. Done when `docker-compose up` creates all 8 tables and `SELECT` on each works.
- [x] **Phase 0 exit spike — OSM PBF importer PoC**: `scripts/import-pbf.ts` downloads a small regional `.pbf`, filters `tourism=camp_site|fuel|dump_station`, inserts 10–20 places into the `places` table. Done when `SELECT COUNT(*) FROM places WHERE source_type='osm'` > 0.
- [x] **Phase 0 exit spike — self-hosted PMTiles PoC**: download a regional PMTiles, mount into the web container, point MapLibre at the local tile URL instead of the demo. Done when the map renders without any external tile request.

### External validation (roadmap exit criteria)

- [ ] Federation profile (`docs/spec/federation.md`) reviewed by ≥ 2 people active in ActivityPub spec work
- [ ] OSM/ODbL boundary (`docs/spec/osm.md`) reviewed by an OSM contributor
- [ ] Public tracking issue `phase-0` updated on every milestone; closed when every checkbox on this list is ticked

### Announce (only after spikes are green)

- [ ] Fediverse post from `@trailfed@fosstodon.org`
- [ ] `r/selfhosted`, `r/fediverse` posts linking to repo
- [ ] NLnet NGI0 grant enquiry — https://nlnet.nl/propose/

---

## Phase 1 — ActivityPub MVP

Scope per `docs/roadmap.md`: minimal working federated server with user accounts, basic follow graph, places published as `Create Place`, and inter-instance delivery.

### Federation primitives

- [x] **HTTP Signature verification on inbox** — parse `Signature` header, fetch remote actor's public key, verify `(request-target) host date digest` per draft-cavage-12. Reject unsigned / bad-sig deliveries with 401. Route accepted payloads through a typed dispatcher (by Activity `type`). Done when a signed `Follow` from a second local instance reaches the dispatcher and an unsigned copy is rejected with 401.
- [x] **Actor persistence** — replace the hardcoded `stub` actor with rows in the `actors` table; key material loaded from DB, not env. Seed a single `stub` row on first boot for continuity. Done when `/actors/stub` serves from DB and WebFinger resolves any actor from `actors.preferred_username`.
- [x] **Outbox + signed delivery** — `POST /actors/:user/outbox` accepts an activity, persists to `activities`, and delivers to each recipient inbox with HTTP Signature using the actor's private key. Done when a delivery from instance A lands verified in instance B's inbox.
- [x] **Follow / Accept** — inbox dispatcher handles incoming `Follow`, persists to `follows`, auto-replies with `Accept`. Done when a second local instance's actor shows as a follower after a round-trip.

### `Place` activity end-to-end

- [x] Extend Activity vocabulary with `Place` (name, category, geo) — update `docs/spec/federation.md` with the JSON-LD shape.
- [x] `Create Place` out of the outbox of an actor creates a row in `places` + `place_sources` (source=`activitypub`).
- [x] Inbound `Create Place` from a remote actor is stored locally and appears on the map with `source=remote`.

### User accounts

- [x] Minimal registration endpoint (username + password via argon2id) creating an `actors` row with generated keypair.
- [x] WebFinger resolves any registered username (not just `stub`).

### Moderation

- [x] Instance-level block list (domain-based) — drop inbox deliveries from blocked hosts before signature check.
- [x] Report activity: `Flag` stored in `activities` with moderator queue endpoint.

### Exit criteria

- [x] Two local instances exchange a full Follow → Accept → Create Place → inbox dispatch round-trip. Implemented as `federation/e2e.test.ts`: two `createApp` instances in-process, global-fetch router between them, assertions on the resulting `follows` and `places` rows. Two-host docker harness is a separate follow-up.

---

## Phase 2+ — see `docs/roadmap.md`

Not tracked here yet. Items will be lifted into this file as they enter the working set.

---

## CI / automation (cross-phase)

- [ ] SSH-based deploy workflow for `trailfed/trailfed.org` → `trailfed.org` landing (on push to `main`)
- [ ] SSH-based deploy workflow for `trailfed/trailfed` → `camp.trailfed.org` (on push to `main`; `docker compose pull && up -d`)
- [x] Pull request template with reminders: NEXT_STEPS.md updated, CHANGELOG entry added or N/A
- [x] Dependabot or renovate for dependency bumps
- [x] Dependabot auto-merge workflow (approve + enable auto-merge when CI green)
