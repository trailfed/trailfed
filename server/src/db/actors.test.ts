// SPDX-License-Identifier: AGPL-3.0-or-later

// Integration test: exercises ensureLocalActor against a real Postgres.
// Skipped when DATABASE_URL is unset so CI without a database does not fail.

import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { ensureLocalActor, findLocalActorByUsername } from './actors.js';
import { createDbClient } from './client.js';
import { runMigrations } from './migrate.js';

const databaseUrl = process.env.DATABASE_URL;
const describeIfDb = databaseUrl ? describe : describe.skip;

describeIfDb('ensureLocalActor', () => {
  let client: ReturnType<typeof createDbClient>;
  const testUsername = `ensuretest_${Date.now()}`;
  const testDomain = 'test.trailfed.local';

  beforeAll(async () => {
    await runMigrations(databaseUrl!);
    client = createDbClient(databaseUrl!);
  });

  afterAll(async () => {
    if (client) {
      await client.db.execute(
        sql`DELETE FROM actors WHERE username = ${testUsername} AND domain = ${testDomain}`,
      );
      await client.sql.end({ timeout: 5 });
    }
  });

  it('inserts a new row on first call and returns the same keypair on the second', async () => {
    const first = await ensureLocalActor(client.db, {
      username: testUsername,
      domain: testDomain,
      publicOrigin: `https://${testDomain}`,
      displayName: 'Ensure Test',
    });
    expect(first.username).toBe(testUsername);
    expect(first.publicKeyJwk).toMatchObject({ kty: 'RSA' });
    expect(first.privateKeyJwk).toMatchObject({ kty: 'RSA' });

    const second = await ensureLocalActor(client.db, {
      username: testUsername,
      domain: testDomain,
      publicOrigin: `https://${testDomain}`,
    });
    expect(second.id).toBe(first.id);
    expect(second.publicKeyJwk).toEqual(first.publicKeyJwk);

    const looked = await findLocalActorByUsername(client.db, testUsername, testDomain);
    expect(looked?.id).toBe(first.id);
  });
});
