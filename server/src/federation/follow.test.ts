// SPDX-License-Identifier: AGPL-3.0-or-later

// Integration test: drives the Follow handler end-to-end. Skipped without
// DATABASE_URL.

import { and, eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { pino } from 'pino';

import { ensureLocalActor } from '../db/actors.js';
import { createDbClient } from '../db/client.js';
import { runMigrations } from '../db/migrate.js';
import { actors, follows } from '../db/schema.js';

import { makeFollowHandler } from './follow.js';

const databaseUrl = process.env.DATABASE_URL;
const describeIfDb = databaseUrl ? describe : describe.skip;
const log = pino({ level: 'silent' });

describeIfDb('Follow handler', () => {
  let client: ReturnType<typeof createDbClient>;
  const targetUsername = `follow_target_${Date.now()}`;
  const domain = 'follow-test.trailfed.local';
  const publicOrigin = `https://${domain}`;
  const followerUri = 'https://remote.example/actors/alice';
  const followerInbox = 'https://remote.example/actors/alice/inbox';

  beforeAll(async () => {
    await runMigrations(databaseUrl!);
    client = createDbClient(databaseUrl!);
  });

  afterAll(async () => {
    if (client) {
      await client.db.execute(
        sql`DELETE FROM follows WHERE target_actor_id IN (SELECT id FROM actors WHERE username = ${targetUsername} AND domain = ${domain})`,
      );
      await client.db.execute(
        sql`DELETE FROM actors WHERE (username = ${targetUsername} AND domain = ${domain}) OR uri = ${followerUri}`,
      );
      await client.sql.end({ timeout: 5 });
    }
  });

  it('persists the follow row and delivers an Accept to the follower inbox', async () => {
    const target = await ensureLocalActor(client.db, {
      username: targetUsername,
      domain,
      publicOrigin,
      displayName: 'Follow Target',
    });

    const deliver = vi.fn(async () => true);
    const resolveInbox = vi.fn(async (uri: string) => (uri === followerUri ? followerInbox : null));

    const handler = makeFollowHandler({
      db: client.db,
      publicOrigin,
      deliver,
      resolveInbox,
    });

    const targetUri = `${publicOrigin}/actors/${targetUsername}`;
    await handler(
      {
        type: 'Follow',
        actor: followerUri,
        object: targetUri,
      },
      { signerKeyId: `${followerUri}#main-key`, log },
    );

    // Remote actor row created.
    const followerRows = await client.db.select().from(actors).where(eq(actors.uri, followerUri));
    expect(followerRows.length).toBe(1);
    expect(followerRows[0].isLocal).toBe(false);

    // Follow row written and accepted.
    const followRows = await client.db
      .select()
      .from(follows)
      .where(and(eq(follows.actorId, followerRows[0].id), eq(follows.targetActorId, target.id)));
    expect(followRows.length).toBe(1);
    expect(followRows[0].acceptedAt).not.toBeNull();

    // Accept delivered.
    expect(deliver).toHaveBeenCalledTimes(1);
    const callArg = deliver.mock.calls[0][0];
    expect(callArg.inboxUrl).toBe(followerInbox);
    const activity = callArg.activity as { type: string; actor: string; object: unknown };
    expect(activity.type).toBe('Accept');
    expect(activity.actor).toBe(targetUri);
    expect(activity.object).toMatchObject({ type: 'Follow', actor: followerUri });
  });
});
