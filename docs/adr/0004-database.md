# ADR-0004: Database — PostgreSQL 16 + PostGIS 3.4

**Status:** Accepted
**Date:** 2026-04-22
**Deciders:** @kopaev

## Context

We store POIs (point geometry + attributes), activities (ActivityPub objects), users, check-ins, and OSM-derived data. We need spatial indices (GIST), KNN queries, and reliable transactional semantics across relational data and JSON.

## Decision

- **PostgreSQL 16** as the primary datastore.
- **PostGIS 3.4** for spatial types and indices.
- **Drizzle ORM** as the type-safe query builder / migrations tool.

## Consequences

**Positive**
- PostGIS is the de-facto standard for open geospatial data; extensive operator ecosystem.
- JSONB for ActivityPub objects we don't want to over-model.
- GIST indices on `geography(Point, 4326)` give us O(log n) nearest-neighbor and bbox queries.
- Drizzle gives us TypeScript-native migrations and compile-time SQL type safety.

**Negative**
- Self-hosters must run a PostgreSQL with PostGIS extension (but the `postgis/postgis` Docker image makes this one line).
- Backup sizes for the `activities` table grow linearly; we provide retention / archival guidance in Phase 5.

**Neutral**
- We avoid per-user sharding in v1.0; a well-tuned single Postgres handles the scale of a small instance. Larger instances can add read replicas.

## Alternatives considered

- **SQLite with SpatiaLite** — rejected: insufficient for federated workloads with concurrent writers.
- **MongoDB + geospatial indices** — rejected: weaker relational guarantees, ORM ecosystem, and PostGIS outperforms for our queries.
- **Prisma ORM** — considered; chose Drizzle for smaller footprint, better SQL transparency, and native PostGIS type support via custom types.

## References

- [PostGIS docs](https://postgis.net/documentation/)
- [Drizzle ORM](https://orm.drizzle.team/)
