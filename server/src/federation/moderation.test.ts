// SPDX-License-Identifier: AGPL-3.0-or-later

// Integration test for block-list + Flag handler. Skipped without DATABASE_URL.

import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { pino } from 'pino';

import { createDbClient } from '../db/client.js';
import { runMigrations } from '../db/migrate.js';

import {
  addBlock,
  isDomainBlocked,
  listBlocks,
  listRecentFlags,
  makeFlagHandler,
} from './moderation.js';

const databaseUrl = process.env.DATABASE_URL;
const describeIfDb = databaseUrl ? describe : describe.skip;
const log = pino({ level: 'silent' });

describeIfDb('moderation', () => {
  let client: ReturnType<typeof createDbClient>;
  const tag = `mod_test_${Date.now()}`;
  const blockedDomain = `blocked-${tag}.example`;
  const flagUri = `urn:flag:${tag}`;

  beforeAll(async () => {
    await runMigrations(databaseUrl!);
    client = createDbClient(databaseUrl!);
  });

  afterAll(async () => {
    if (client) {
      await client.db.execute(sql`DELETE FROM peers WHERE domain = ${blockedDomain}`);
      await client.db.execute(sql`DELETE FROM activities WHERE uri = ${flagUri}`);
      await client.sql.end({ timeout: 5 });
    }
  });

  it('addBlock + isDomainBlocked round-trip', async () => {
    expect(await isDomainBlocked(client.db, blockedDomain)).toBe(false);
    await addBlock(client.db, blockedDomain);
    expect(await isDomainBlocked(client.db, blockedDomain)).toBe(true);
    // Idempotent.
    await addBlock(client.db, blockedDomain);
    const listed = await listBlocks(client.db);
    expect(listed).toContain(blockedDomain);
  });

  it('Flag handler persists the activity', async () => {
    const handler = makeFlagHandler({ db: client.db });
    await handler(
      {
        id: flagUri,
        type: 'Flag',
        actor: 'https://remote.example/actors/reporter',
        object: 'https://camp.trailfed.org/places/abc',
        content: 'spam',
      },
      { signerKeyId: 'key', log },
    );
    const flags = await listRecentFlags(client.db);
    const found = flags.find((f) => f.uri === flagUri);
    expect(found).toBeTruthy();
  });
});
