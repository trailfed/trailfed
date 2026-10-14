# Architecture Decision Records

We record significant architectural choices as ADRs, lightly following the [MADR](https://adr.github.io/madr/) format.

| ID | Status | Title |
|----|--------|-------|
| [0001](0001-backend-stack.md) | Accepted | Backend stack: TypeScript + Fedify |
| [0002](0002-runtime.md) | Accepted | Runtime: Node.js 20 LTS |
| [0003](0003-frontend-stack.md) | Accepted | Frontend: SvelteKit + MapLibre + PMTiles |
| [0004](0004-database.md) | Accepted | Database: PostgreSQL 16 + PostGIS 3.4 |
| [0005](0005-license.md) | Accepted | License: AGPL-3.0-or-later |
| [0006](0006-realtime.md) | Accepted | Real-time: Centrifugo v6 standalone |
| [0007](0007-monorepo.md) | Accepted | Monorepo with pnpm workspaces |
| [0008](0008-geocoding-deferred.md) | Deferred | Self-hosted Nominatim/OSRM is optional |
| [0009](0009-lego-stack-rule.md) | Accepted | Lego-stack rule: off-the-shelf libraries only |
| [0010](0010-sync-protocol-first.md) | Accepted | Sync protocol first — observations, feeds and a shared status rule |
| [0011](0011-per-entry-data-license.md) | Accepted | Data licence per entry, attribution required |

ADRs 0001–0008 describe the v0.1 reference server; after ADR-0010 that server is a frozen demo and
these decisions apply to it only. The protocol itself requires no particular stack.

## Process

New ADRs are proposed via PR. An ADR is "accepted" when merged to `main`; later ADRs may supersede earlier ones, in which case both files are kept and cross-linked.

## Template

```markdown
# ADR-XXXX: <short title>

**Status:** Proposed | Accepted | Deprecated | Superseded by ADR-YYYY
**Date:** YYYY-MM-DD
**Deciders:** @handle1, @handle2

## Context
<!-- what problem are we solving, what constraints exist -->

## Decision
<!-- the chosen option, one paragraph -->

## Consequences
<!-- positive, negative, neutral impacts -->

## Alternatives considered
<!-- what else we looked at and why we didn't pick it -->
```
