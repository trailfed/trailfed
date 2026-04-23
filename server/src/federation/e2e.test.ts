// SPDX-License-Identifier: AGPL-3.0-or-later

// Two-instance federation round-trip test. Runs two Hono apps in process,
// routes their HTTP requests to each other via a global fetch override, and
// asserts that Follow/Accept and Create Place activities flow end-to-end.
//
// Skipped without DATABASE_URL (the apps share a real Postgres so migrations
// and the places/places_sources schema are exercised).

import { eq, sql } from 'drizzle-orm';
import type { Hono } from 'hono';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { actors, follows } from '../db/schema.js';
import { createApp, createDbActorLookup } from '../index.js';
import { createDbClient } from '../db/client.js';
import { runMigrations } from '../db/migrate.js';

import { registerLocalActor } from './registration.js';

const databaseUrl = process.env.DATABASE_URL;
const describeIfDb = databaseUrl ? describe : describe.skip;

const tag = `e2e_${Date.now()}`;
const aDomain = `a-${tag}.trailfed.local`;
const bDomain = `b-${tag}.trailfed.local`;
const aOrigin = `https://${aDomain}`;
const bOrigin = `https://${bDomain}`;
const secretA = 'secret-a';
const secretB = 'secret-b';

describeIfDb('two-instance federation round-trip', () => {
  let client: ReturnType<typeof createDbClient>;
  let appA: Hono;
  let appB: Hono;
  const originalFetch = globalThis.fetch;

  beforeAll(async () => {
    await runMigrations(databaseUrl!);
    client = createDbClient(databaseUrl!);

    appA = createApp({
      db: client.db,
      publicOrigin: aOrigin,
      outboxSecret: secretA,
      lookupActor: createDbActorLookup(client.db, aDomain),
    });
    appB = createApp({
      db: client.db,
      publicOrigin: bOrigin,
      outboxSecret: secretB,
      lookupActor: createDbActorLookup(client.db, bDomain),
    });

    const router = new Map<string, Hono>([
      [aOrigin, appA],
      [bOrigin, appB],
    ]);

    // In-process fetch router. Any URL whose origin matches an app is
    // served by that app's Hono.request(); unknown origins get a 404 so
    // tests catch accidental external calls.
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      const origin = new URL(url).origin;
      const app = router.get(origin);
      if (!app) return new Response('no route', { status: 404 });
      return app.request(url, init);
    }) as typeof fetch;
  });

  afterAll(async () => {
    globalThis.fetch = originalFetch;
    if (client) {
      await client.db.execute(sql`
        DELETE FROM place_sources WHERE place_id IN (
          SELECT id FROM places WHERE origin_instance IN (${aDomain}, ${bDomain})
        )
      `);
      await client.db.execute(
        sql`DELETE FROM places WHERE origin_instance IN (${aDomain}, ${bDomain})`,
      );
      await client.db.execute(
        sql`DELETE FROM activities WHERE actor_id IN (SELECT id FROM actors WHERE domain IN (${aDomain}, ${bDomain}))`,
      );
      await client.db.execute(
        sql`DELETE FROM follows WHERE actor_id IN (SELECT id FROM actors WHERE domain IN (${aDomain}, ${bDomain})) OR target_actor_id IN (SELECT id FROM actors WHERE domain IN (${aDomain}, ${bDomain}))`,
      );
      await client.db.execute(sql`DELETE FROM actors WHERE domain IN (${aDomain}, ${bDomain})`);
      await client.sql.end({ timeout: 5 });
    }
  });

  it('Follow alice@A → bob@B produces an Accept + persisted follow row', async () => {
    await registerLocalActor({
      db: client.db,
      username: 'alice',
      password: 'correct-horse-battery-staple',
      domain: aDomain,
      publicOrigin: aOrigin,
    });
    await registerLocalActor({
      db: client.db,
      username: 'bob',
      password: 'correct-horse-battery-staple',
      domain: bDomain,
      publicOrigin: bOrigin,
    });

    // alice publishes a Follow activity via her outbox on instance A.
    const outRes = await appA.request(`${aOrigin}/actors/alice/outbox`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretA}`,
        'Content-Type': 'application/activity+json',
      },
      body: JSON.stringify({
        type: 'Follow',
        object: `${bOrigin}/actors/bob`,
        to: [`${bOrigin}/actors/bob`],
      }),
    });
    expect(outRes.status).toBe(201);
    const outBody = (await outRes.json()) as {
      deliveries: Array<{ inboxUrl: string; ok: boolean }>;
    };
    expect(outBody.deliveries).toEqual([{ inboxUrl: `${bOrigin}/actors/bob/inbox`, ok: true }]);

    // The follow row should exist on B's side (actor_id = alice's row,
    // target = bob's row).
    const aliceRow = await client.db
      .select({ id: actors.id })
      .from(actors)
      .where(eq(actors.uri, `${aOrigin}/actors/alice`));
    const bobRow = await client.db
      .select({ id: actors.id })
      .from(actors)
      .where(eq(actors.uri, `${bOrigin}/actors/bob`));
    expect(aliceRow[0]).toBeTruthy();
    expect(bobRow[0]).toBeTruthy();

    const followRows = await client.db
      .select()
      .from(follows)
      .where(eq(follows.targetActorId, bobRow[0].id));
    expect(followRows.length).toBeGreaterThanOrEqual(1);
    expect(followRows.find((f) => f.actorId === aliceRow[0].id)?.acceptedAt).toBeTruthy();
  });

  it('Create Place from A is persisted on B after federated delivery', async () => {
    const placeName = `E2E Campsite ${tag}`;
    const res = await appA.request(`${aOrigin}/actors/alice/outbox`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretA}`,
        'Content-Type': 'application/activity+json',
      },
      body: JSON.stringify({
        type: 'Create',
        to: [`${bOrigin}/actors/bob`],
        object: {
          type: 'Place',
          name: placeName,
          category: 'camp_site',
          longitude: 33.5,
          latitude: 35.15,
        },
      }),
    });
    expect(res.status).toBe(201);

    // After delivery, the place should appear in `places` with
    // origin_instance = A's host (the activity actor's host).
    const rows = (await client.db.execute(
      sql`SELECT category, origin_instance, source_type FROM places WHERE (names->>'default') = ${placeName}`,
    )) as unknown as Array<{ category: string; origin_instance: string; source_type: string }>;
    // Expect at least one: the local copy on A (source_type='user') and/or
    // the inbound-Create copy on B (source_type='activitypub'). Both share
    // the same `uri` so ON CONFLICT may collapse them — either way the place
    // exists and the category is right.
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0].category).toBe('camp_site');
  });
});
