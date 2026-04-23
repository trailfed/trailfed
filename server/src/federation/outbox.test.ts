// SPDX-License-Identifier: AGPL-3.0-or-later

// Integration test: persists an activity through publishFromOutbox and
// checks that both the DB row and the delivery mock were invoked. Skipped
// without DATABASE_URL.

import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { pino } from 'pino';

import { ensureLocalActor } from '../db/actors.js';
import { createDbClient } from '../db/client.js';
import { runMigrations } from '../db/migrate.js';
import { activities } from '../db/schema.js';

import { publishFromOutbox } from './outbox.js';

const databaseUrl = process.env.DATABASE_URL;
const describeIfDb = databaseUrl ? describe : describe.skip;
const log = pino({ level: 'silent' });

describeIfDb('publishFromOutbox', () => {
  let client: ReturnType<typeof createDbClient>;
  const username = `outbox_${Date.now()}`;
  const domain = 'outbox-test.trailfed.local';
  const publicOrigin = `https://${domain}`;

  beforeAll(async () => {
    await runMigrations(databaseUrl!);
    client = createDbClient(databaseUrl!);
  });

  afterAll(async () => {
    if (client) {
      await client.db.execute(
        sql`DELETE FROM activities WHERE actor_id IN (SELECT id FROM actors WHERE username = ${username} AND domain = ${domain})`,
      );
      await client.db.execute(
        sql`DELETE FROM actors WHERE (username = ${username} AND domain = ${domain}) OR uri = 'https://remote.example/actors/bob'`,
      );
      await client.sql.end({ timeout: 5 });
    }
  });

  it('inserts the activity and delivers to every recipient inbox', async () => {
    const actor = await ensureLocalActor(client.db, {
      username,
      domain,
      publicOrigin,
      displayName: 'Outbox Tester',
    });

    const resolveInbox = vi.fn(async (uri: string) =>
      uri === 'https://remote.example/actors/bob'
        ? 'https://remote.example/actors/bob/inbox'
        : null,
    );
    const deliver = vi.fn(async () => true);

    const result = await publishFromOutbox({
      db: client.db,
      actor,
      activityInput: {
        type: 'Follow',
        object: 'https://remote.example/actors/bob',
        to: ['https://remote.example/actors/bob'],
      },
      publicOrigin,
      log,
      deliver,
      resolveInbox,
    });

    expect(result.id).toMatch(new RegExp(`^${publicOrigin}/activities/`));
    expect(result.deliveries).toEqual([
      { inboxUrl: 'https://remote.example/actors/bob/inbox', ok: true },
    ]);
    expect(deliver).toHaveBeenCalledTimes(1);
    const callArg = deliver.mock.calls[0][0];
    expect(callArg.inboxUrl).toBe('https://remote.example/actors/bob/inbox');
    expect(callArg.keyId).toBe(`${publicOrigin}/actors/${username}#main-key`);

    // Activity row persisted.
    const rows = await client.db.select().from(activities).where(eq(activities.uri, result.id));
    expect(rows.length).toBe(1);
    expect(rows[0].type).toBe('Follow');
    expect(rows[0].actorId).toBe(actor.id);
  });
});
