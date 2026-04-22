# TrailFed

**Federated geo-social protocol for travellers.**

TrailFed is an open-source, ActivityPub-based protocol and reference server for people on the move: van-lifers, overlanders, sailors, cyclists, anglers, hikers and digital nomads. Each instance is self-hosted and federates places of interest (POI), check-ins and travel tracks with trusted peers — the Mastodon model applied to travel.

> **Status:** Phase 0 — not production ready. See [docs/roadmap.md](docs/roadmap.md).

## Why

Today travellers juggle 5–7 closed platforms (Park4Night, iOverlander, Campendium, Polarsteps, Navily…), each owning its own silo of reviews and locations. TrailFed provides a shared federation layer so that:

- **Any community can run its own instance** — vanlife, fishing, motorbike touring, sea-faring — and still exchange data with allied peers.
- **Your data lives where you do.** No centralised operator to shut you down or sell your location history.
- **OpenStreetMap stays primary** for base geography; TrailFed adds the human layer on top — reviews, ephemeral amenities, check-ins, travel stories.

## 5-minute quickstart (dev)

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

See [docs/deployment.md](docs/deployment.md) for production.

## Documentation

- [Vision](docs/vision.md) — what we're building and why
- [Positioning](docs/positioning.md) — how TrailFed compares to existing solutions
- [Architecture overview](docs/architecture/overview.md)
- [Tech stack](docs/architecture/stack.md)
- [Federation spec](docs/spec/federation.md) — ActivityPub + geo extensions
- [OSM integration](docs/spec/osm.md) — ODbL-compliant import/export
- [Privacy model](docs/spec/privacy.md)
- [Roadmap](docs/roadmap.md) — seven phases to v1.0
- [Architecture decisions](docs/adr/) — ADRs

## Contributing

We follow a DCO sign-off flow (no CLA). See [CONTRIBUTING.md](CONTRIBUTING.md).

Good first issues are labelled `good-first-issue`. All participants must follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

TrailFed is licensed under the [GNU Affero General Public License v3.0 or later](LICENSE). This protects the project from closed-source SaaS forks while remaining compatible with the ActivityPub ecosystem.

## Security

Please do **not** file public issues for security vulnerabilities. See [SECURITY.md](SECURITY.md).
