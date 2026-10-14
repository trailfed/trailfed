# TrailFed

**An open protocol for keeping travel place data in sync between apps.**

A traveller marks a spot as closed in one app. Within minutes every connected app shows it closed —
the same status, for the same reason, with credit to the app where it was reported.

TrailFed lets independent vanlife, RV and overland apps share one current picture of places —
campsites, overnight spots, water, dump stations — while each keeps its own users, UI and database.
Apps exchange **facts** (observations), never overwrite each other, and derive each place's status
by **one shared rule** pinned by test vectors.

> **Status:** v0.2 draft specification. The v0.1 ActivityPub reference server is kept as a frozen
> demo. See [docs/roadmap.md](docs/roadmap.md) and [ADR-0010](docs/adr/0010-sync-protocol-first.md)
> for why the project changed course.

## Why

Travellers juggle Park4Night, iOverlander, Campendium and many smaller apps; each owns an island of
data. A closure reported in one app never reaches the others, and a new app starts from zero.
Central "open databases" failed because no app hands its data to someone else. TrailFed keeps the
data where it is and agrees only on the format and the rule:

- **Facts, not records** — `place`, `observation`, `link`, `retraction` entries, append-only.
- **Same facts → same status** — a normative [status resolution](docs/spec/status-resolution.md)
  with [test vectors](docs/spec/vectors/).
- **Catch-up built in** — a cursor feed with the full history: a new app gets everything on day one.
- **OpenStreetMap as the base** — OSM tags as vocabulary, OSM ids as identity.
- **Credit and licence per entry** — every app is attributed wherever its data is shown.
- **Small** — a Reader or Publisher fits in a week in any stack.

## Read the spec

- [Core protocol](docs/spec/core.md) — entries, discovery, feed, push, identity, trust, privacy, licensing
- [Status resolution](docs/spec/status-resolution.md) — when a spot counts as closed (normative)
- [JSON Schemas](docs/spec/schema/) and [test vectors](docs/spec/vectors/)
- Reference implementation of the status rule: [`server/src/protocol/status.ts`](server/src/protocol/status.ts)

Run the vectors:

```bash
pnpm install
pnpm --filter @trailfed/server exec vitest run src/protocol
```

## Reference server demo (v0.1, frozen)

```bash
git clone https://github.com/trailfed/trailfed.git
cd trailfed
cp .env.example .env
docker compose up -d postgres
DATABASE_URL=postgres://trailfed:trailfed_dev_only@localhost:5432/trailfed \
  pnpm --filter @trailfed/server migrate
docker compose up
```

Open [http://localhost:8090](http://localhost:8090). A stub WebFinger responder lives at `/.well-known/webfinger`.

> **Database migrations** are applied explicitly via `pnpm --filter @trailfed/server migrate` (Drizzle), not on server boot. Schema lives in `server/src/db/schema.ts`; SQL migrations under `server/src/db/migrations/`.

To get a real map instead of the MapLibre demo basemap, drop a regional PMTiles file into `infra/pmtiles/` — see [`infra/pmtiles/README.md`](infra/pmtiles/README.md) for the Cyprus quick-start.

See [docs/deployment.md](docs/deployment.md) for production.

## Documentation

- [Vision](docs/vision.md) — what we're building and why (v0.2)
- [Positioning](docs/positioning.md) — prior art and how TrailFed differs
- [Core protocol](docs/spec/core.md) and [status resolution](docs/spec/status-resolution.md)
- [OSM integration](docs/spec/osm.md) — identity, vocabulary, ODbL
- [Privacy](docs/spec/privacy.md) — per-place pseudonyms, erasure
- [ActivityPub bridge](docs/spec/federation.md) — optional announcements to the Fediverse
- [Roadmap](docs/roadmap.md) · [Risks](docs/risks.md) · [Architecture decisions](docs/adr/)

## Contributing

We follow a DCO sign-off flow (no CLA). See [CONTRIBUTING.md](CONTRIBUTING.md).

Good first issues are labelled `good-first-issue`. All participants must follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

Code is licensed under the [GNU Affero General Public License v3.0 or later](LICENSE). Data exchanged over the protocol carries its own licence per entry ([ADR-0011](docs/adr/0011-per-entry-data-license.md)); implementing the protocol in your own app does not require using our code.

## Security

Please do **not** file public issues for security vulnerabilities. See [SECURITY.md](SECURITY.md).
