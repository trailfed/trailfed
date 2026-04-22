-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Bootstrap for a fresh TrailFed database.
-- Idempotent: safe to run on every container start.

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Real schema is created by Drizzle migrations from server/ in Phase 1.
