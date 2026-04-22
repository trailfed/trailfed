# ADR-0007: Monorepo with pnpm workspaces

**Status:** Accepted
**Date:** 2026-04-22
**Deciders:** @kopaev

## Context

`server/` and `web/` share types (ActivityPub object shapes, REST DTOs, config schemas). Separate repos would force us to publish a shared `@trailfed/types` package on every change and drift inevitably.

## Decision

Single repository `trailfed/trailfed` as a monorepo. Workspaces managed by **[pnpm](https://pnpm.io/)**.

Layout:
```
/server     — Fedify backend
/web        — SvelteKit frontend
/shared     — shared types, constants, validators (added when needed)
/infra      — Dockerfiles, compose, Caddy, Centrifugo configs
/docs       — specification, ADRs, user docs
```

## Consequences

**Positive**
- One PR can land an API change and its frontend consumer atomically.
- Shared tsconfig, ESLint and Prettier config.
- `pnpm -r` runs scripts across workspaces.
- pnpm's content-addressable store keeps `node_modules` small and installs fast.

**Negative**
- Contributors must learn pnpm (easy) and workspace semantics.
- Larger clone than split repos; acceptable for this project's size.

**Neutral**
- If mobile or SDK packages appear, they go into the same monorepo (`/sdk`, `/mobile`).

## Alternatives considered

- **Separate repos per package** — rejected: cross-repo coordination overhead, release churn.
- **npm workspaces** — viable but pnpm is faster and has stricter dependency isolation, preventing accidental phantom deps.
- **Turborepo / Nx** — deferred: can be added later for cached builds when CI time becomes a bottleneck.

## References

- [pnpm workspaces](https://pnpm.io/workspaces)
