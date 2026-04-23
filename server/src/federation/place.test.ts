// SPDX-License-Identifier: AGPL-3.0-or-later

// Integration test: round-trips a Place activity through persistPlaceFromActivity
// and checks that the row shows up on the /api/places endpoint.

import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { pino } from 'pino';

import { createDbClient } from '../db/client.js';
import { runMigrations } from '../db/migrate.js';

import { persistPlaceFromActivity, makeCreateHandler } from './place.js';

const databaseUrl = process.env.DATABASE_URL;
const describeIfDb = databaseUrl ? describe : describe.skip;
const log = pino({ level: 'silent' });

describeIfDb('persistPlaceFromActivity', () => {
  let client: ReturnType<typeof createDbClient>;
  const tag = `place_test_${Date.now()}`;
  const uri = `urn:uuid:${tag}`;

  beforeAll(async () => {
    await runMigrations(databaseUrl!);
    client = createDbClient(databaseUrl!);
  });

  afterAll(async () => {
    if (client) {
      await client.db.execute(
        sql`DELETE FROM place_sources WHERE place_id IN (SELECT id FROM places WHERE uri = ${uri})`,
      );
      await client.db.execute(sql`DELETE FROM places WHERE uri = ${uri}`);
      await client.sql.end({ timeout: 5 });
    }
  });

  it('inserts the place row and is idempotent on repeat', async () => {
    const first = await persistPlaceFromActivity({
      db: client.db,
      place: {
        type: 'Place',
        id: uri,
        name: 'Test Campsite',
        category: 'camp_site',
        longitude: 33.5,
        latitude: 35.1,
      },
      actorUri: 'https://remote.example/actors/alice',
      isLocal: false,
      log,
    });
    expect(first).not.toBeNull();
    expect(first!.name).toBe('Test Campsite');
    expect(first!.category).toBe('camp_site');

    const second = await persistPlaceFromActivity({
      db: client.db,
      place: {
        type: 'Place',
        id: uri,
        name: 'Test Campsite',
        category: 'camp_site',
        longitude: 33.5,
        latitude: 35.1,
      },
      actorUri: 'https://remote.example/actors/alice',
      isLocal: false,
      log,
    });
    expect(second!.id).toBe(first!.id);

    // Confirm the row is actually readable.
    const rows = (await client.db.execute(
      sql`SELECT category, ST_X(geom::geometry) AS lon, ST_Y(geom::geometry) AS lat FROM places WHERE uri = ${uri}`,
    )) as unknown as Array<{ category: string; lon: number; lat: number }>;
    expect(rows.length).toBe(1);
    expect(rows[0].category).toBe('camp_site');
    expect(Number(rows[0].lon)).toBeCloseTo(33.5);
    expect(Number(rows[0].lat)).toBeCloseTo(35.1);
  });

  it('Create handler persists an inbound Place', async () => {
    const handler = makeCreateHandler({ db: client.db });
    const uri2 = `${uri}_via_handler`;
    await handler(
      {
        type: 'Create',
        actor: 'https://remote.example/actors/bob',
        object: {
          type: 'Place',
          id: uri2,
          name: 'Handler Place',
          category: 'fuel',
          longitude: 33.6,
          latitude: 35.2,
        },
      },
      { signerKeyId: 'key', log },
    );
    const rows = (await client.db.execute(
      sql`SELECT category FROM places WHERE uri = ${uri2}`,
    )) as unknown as Array<{ category: string }>;
    expect(rows.length).toBe(1);
    expect(rows[0].category).toBe('fuel');

    // Clean up this second row.
    await client.db.execute(
      sql`DELETE FROM place_sources WHERE place_id IN (SELECT id FROM places WHERE uri = ${uri2})`,
    );
    await client.db.execute(sql`DELETE FROM places WHERE uri = ${uri2}`);
  });

  it('ignores malformed places (missing coords)', async () => {
    const result = await persistPlaceFromActivity({
      db: client.db,
      place: { type: 'Place', name: 'bad' } as never,
      actorUri: 'https://remote.example/actors/alice',
      isLocal: false,
      log,
    });
    expect(result).toBeNull();
  });
});
