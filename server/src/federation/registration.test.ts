// SPDX-License-Identifier: AGPL-3.0-or-later

// Integration test for registerLocalActor. Skipped without DATABASE_URL.

import { verify as argon2Verify } from '@node-rs/argon2';
import { and, eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { actors } from '../db/schema.js';
import { createDbClient } from '../db/client.js';
import { runMigrations } from '../db/migrate.js';

import { registerLocalActor } from './registration.js';

const databaseUrl = process.env.DATABASE_URL;
const describeIfDb = databaseUrl ? describe : describe.skip;

describeIfDb('registerLocalActor', () => {
  let client: ReturnType<typeof createDbClient>;
  const username = `reg_${Date.now()}`;
  const domain = 'reg-test.trailfed.local';
  const publicOrigin = `https://${domain}`;
  const password = 'correct-horse-battery-staple';

  beforeAll(async () => {
    await runMigrations(databaseUrl!);
    client = createDbClient(databaseUrl!);
  });

  afterAll(async () => {
    if (client) {
      await client.db.execute(
        sql`DELETE FROM actors WHERE username LIKE ${'reg_%'} AND domain = ${domain}`,
      );
      await client.sql.end({ timeout: 5 });
    }
  });

  it('creates a local actor with an argon2 hash we can verify', async () => {
    const result = await registerLocalActor({
      db: client.db,
      username,
      password,
      domain,
      publicOrigin,
      displayName: 'Reg Tester',
    });
    expect(result).toEqual({ ok: true, actorUri: `${publicOrigin}/actors/${username}` });

    const rows = await client.db
      .select()
      .from(actors)
      .where(and(eq(actors.username, username), eq(actors.domain, domain)));
    expect(rows.length).toBe(1);
    expect(rows[0].isLocal).toBe(true);
    expect(rows[0].passwordHash).toBeTruthy();
    expect(rows[0].publicKeyJwk).toMatchObject({ kty: 'RSA' });

    const verified = await argon2Verify(rows[0].passwordHash!, password);
    expect(verified).toBe(true);

    const wrong = await argon2Verify(rows[0].passwordHash!, 'wrong-password');
    expect(wrong).toBe(false);
  });

  it('rejects duplicate usernames', async () => {
    const second = await registerLocalActor({
      db: client.db,
      username,
      password,
      domain,
      publicOrigin,
    });
    expect(second).toEqual({ ok: false, reason: 'username_taken' });
  });

  it('rejects weak passwords', async () => {
    const r = await registerLocalActor({
      db: client.db,
      username: `reg_weak_${Date.now()}`,
      password: 'short',
      domain,
      publicOrigin,
    });
    expect(r).toEqual({ ok: false, reason: 'weak_password' });
  });

  it('rejects invalid usernames', async () => {
    const r = await registerLocalActor({
      db: client.db,
      username: 'a b c',
      password,
      domain,
      publicOrigin,
    });
    expect(r).toEqual({ ok: false, reason: 'invalid_username' });
  });
});
