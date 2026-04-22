# Contributing to TrailFed

Thanks for wanting to help! TrailFed is run as an open, community-driven project.

## Quick start (dev)

Prerequisites: Docker 24+ / Docker Compose v2, Node.js 20 LTS, pnpm 9.

```bash
git clone https://github.com/trailfed/trailfed.git
cd trailfed
cp .env.example .env
pnpm install
docker compose up -d postgres centrifugo
pnpm --filter server dev
pnpm --filter web dev
```

`docker compose up` alone also works — it runs the full stack including server and web, but hot reload is only available via the `pnpm … dev` path.

## How we accept contributions

- **Sign off** every commit with `git commit -s -m "..."` — we use the [Developer Certificate of Origin](https://developercertificate.org/) (DCO). No CLA.
- **One logical change per PR.** Small PRs are reviewed faster.
- **Write tests.** `server/` uses vitest; `web/` uses vitest + Playwright.
- **Pass CI.** Lint, typecheck, tests and docker build must be green.
- **Use Conventional Commits** for commit messages: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`, followed by a short, imperative description.

## Branches

- `main` — protected, merges via PR with at least 1 maintainer approval and green CI.
- Feature branches: `feat/<short-slug>`, bugfixes: `fix/<short-slug>`.

## Where to start

- Issues labelled `good-first-issue` are vetted beginner-friendly tasks.
- `help-wanted` are larger tasks we could use a hand on.
- Before implementing a non-trivial change, please open an issue to discuss the approach.

## Architecture decisions

Significant design choices are recorded as ADRs in [docs/adr/](docs/adr/). If your contribution touches the federation protocol, database schema or core dependencies, propose a new ADR in the same PR or separately.

## Specification work

For changes to the ActivityPub extensions, OSM integration or privacy model, please open a discussion first — these affect every deployed instance and require explicit maintainer approval.

## Code style

- **TypeScript**: strict mode on, `pnpm lint` (ESLint) and `pnpm format` (Prettier).
- **SQL migrations**: use Drizzle migrations; never edit an applied migration in place.
- **Comments**: only when *why* is non-obvious. Good names beat comments.

## Tests

- Unit tests colocated with source (`*.test.ts`).
- Integration tests in `server/tests/` run against a real Postgres+PostGIS from `docker compose`.
- Federation interop tests (Phase 1+) run against a local Mastodon/GoToSocial test instance.

## Release process

Maintainers tag `v<major>.<minor>.<patch>` on `main`. CI builds and pushes multi-arch Docker images to `ghcr.io/trailfed/*`.

## Reporting security issues

**Do not open a public issue for security vulnerabilities.** See [SECURITY.md](SECURITY.md).

## Governance

See [GOVERNANCE.md](GOVERNANCE.md) for how decisions are made and how to become a maintainer.

## Questions?

- GitHub Discussions — for design questions, proposals, "how do I".
- Matrix room `#trailfed:matrix.org` (to be created in Phase 0).
- Mastodon: [`@trailfed@fosstodon.org`](https://fosstodon.org/@trailfed) (to be created).

Welcome aboard!
