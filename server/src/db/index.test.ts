// SPDX-License-Identifier: AGPL-3.0-or-later

// Integration test: connects to DATABASE_URL, runs migrations, SELECTs from
// every table, expects zero rows. Skipped when DATABASE_URL is unset so CI
// without a database does not fail.

import { sql } from 'drizzle-orm';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';

import { createDbClient } from './client.js';
import { runMigrations } from './migrate.js';
import {
  actors,
  activities,
  checkins,
  follows,
  liveLocations,
  notes,
  peers,
  placeSources,
  places,
} from './schema.js';

const databaseUrl = process.env.DATABASE_URL;
const describeIfDb = databaseUrl ? describe : describe.skip;

describeIfDb('db schema', () => {
  let client: ReturnType<typeof createDbClient>;

  beforeAll(async () => {
    await runMigrations(databaseUrl!);
    client = createDbClient(databaseUrl!, { max: 2 });
  });

  afterAll(async () => {
    await client?.sql.end({ timeout: 5 });
  });

  const tables = [
    ['actors', actors],
    ['places', places],
    ['place_sources', placeSources],
    ['activities', activities],
    ['notes', notes],
    ['checkins', checkins],
    ['follows', follows],
    ['peers', peers],
    ['live_locations', liveLocations],
  ] as const;

  it.each(tables)('%s exists and is empty', async (_name, table) => {
    const rows = await client.db
      .select()
      .from(table as never)
      .limit(1);
    expect(rows).toEqual([]);
  });

  it('PostGIS is available', async () => {
    const result = await client.db.execute(sql`SELECT PostGIS_Version() as v`);
    expect(result.length).toBeGreaterThan(0);
  });
});
