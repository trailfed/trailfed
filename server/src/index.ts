// SPDX-License-Identifier: AGPL-3.0-or-later

import { serve } from '@hono/node-server';
import { sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { pino } from 'pino';

import { createDbClient, type DbClient } from './db/client.js';
import { ensureLocalActor, findLocalActorByUsername, type LocalActorRecord } from './db/actors.js';
import {
  buildActor,
  buildStubActor,
  generateActorKeyPair,
  publicKeyPemFromPrivate,
} from './federation/actor.js';
import { makeFollowHandler } from './federation/follow.js';
import { fetchActorPublicKeyPem, verifyRequestSignature } from './federation/http-signature.js';
import { dispatchActivity, type ActivityHandler } from './federation/inbox.js';
import { publishFromOutbox } from './federation/outbox.js';
import { makeCreateHandler, persistPlaceFromActivity } from './federation/place.js';
import { registerLocalActor } from './federation/registration.js';

const log = pino({ name: 'trailfed-server' });

// Fallback for the "no DB" mode (used by unit tests and by the docker dev
// stack before migrations run). When DATABASE_URL is set, actors live in the
// `actors` table and this keypair isn't used.
function loadFallbackActorKeys(): { privateKeyPem: string; publicKeyPem: string } {
  const fromEnv = process.env.ACTOR_PRIVATE_KEY_PEM;
  if (fromEnv && fromEnv.trim().length > 0) {
    const privateKeyPem = fromEnv.replace(/\\n/g, '\n');
    return { privateKeyPem, publicKeyPem: publicKeyPemFromPrivate(privateKeyPem) };
  }
  return generateActorKeyPair();
}

const fallbackKeys = loadFallbackActorKeys();

/** Lookup function injected into the app — returns a local actor by username, or null. */
export type ActorLookup = (username: string) => Promise<LocalActorRecord | null>;

const defaultActivityHandlers: Record<string, ActivityHandler> = {};

export interface CreateAppOptions {
  /** DB-backed actor lookup. Falls back to the hardcoded `stub` actor if omitted. */
  lookupActor?: ActorLookup;
  activityHandlers?: Record<string, ActivityHandler>;
  fetchPublicKeyPem?: (keyId: string) => Promise<string | null>;
  /** DB handle — enables the outbox endpoint and the default Follow handler. */
  db?: DbClient;
  /** Public origin (e.g. `https://camp.trailfed.org`) — required with `db`. */
  publicOrigin?: string;
  /**
   * Shared-secret bearer token required on `POST /actors/:u/outbox`. Without
   * a secret the endpoint returns 501. This is a stopgap until real user
   * auth — it lets the reference operator curl into their own outbox.
   */
  outboxSecret?: string;
}

// Fallback lookup used when no DB is wired up — serves the single `stub`
// actor with an in-memory keypair. Kept so the unit-test surface doesn't
// need a Postgres fixture.
const fallbackLookup: ActorLookup = async (username) => {
  if (username !== 'stub') return null;
  return {
    id: 0n,
    username: 'stub',
    domain: 'local',
    displayName: 'TrailFed stub actor',
    bio: 'Phase 0 placeholder actor for the TrailFed reference instance.',
    publicKeyPem: fallbackKeys.publicKeyPem,
    privateKeyPem: fallbackKeys.privateKeyPem,
  };
};

export function createApp(options: CreateAppOptions = {}): Hono {
  const lookupActor = options.lookupActor ?? fallbackLookup;
  // If the caller wires a DB + publicOrigin but provides no explicit handler
  // map, install the default Follow → Accept handler for free.
  const activityHandlers =
    options.activityHandlers ??
    (options.db && options.publicOrigin
      ? {
          Follow: makeFollowHandler({ db: options.db, publicOrigin: options.publicOrigin }),
          Create: makeCreateHandler({ db: options.db }),
        }
      : defaultActivityHandlers);
  const fetchPublicKeyPem = options.fetchPublicKeyPem ?? fetchActorPublicKeyPem;
  const app = new Hono();

  const publicOrigin = process.env.PUBLIC_ORIGIN ?? '';
  const origin = (c: { req: { url: string } }) => publicOrigin || new URL(c.req.url).origin;
  const stubHost = (c: { req: { url: string } }) => new URL(origin(c)).host;

  app.get('/', (c) =>
    c.json({
      name: 'trailfed',
      version: '0.0.0',
      phase: 'Phase 0 — scaffold',
      docs: 'https://github.com/trailfed/trailfed',
    }),
  );

  app.get('/healthz', (c) => c.json({ ok: true }));

  // WebFinger: resolve `acct:<username>@<host>` to the actor URL if that
  // username is a registered local actor.
  app.get('/.well-known/webfinger', async (c) => {
    const resource = c.req.query('resource');
    if (!resource) {
      return c.json({ error: 'missing resource query parameter' }, 400);
    }
    const match = /^acct:([^@]+)@(.+)$/.exec(resource);
    if (!match || match[2] !== stubHost(c)) {
      return c.json({ error: 'unknown resource' }, 404);
    }
    const username = match[1];
    const actor = await lookupActor(username);
    if (!actor) {
      return c.json({ error: 'unknown resource' }, 404);
    }
    const actorId = `${origin(c)}/actors/${username}`;
    return c.json({
      subject: resource,
      links: [
        {
          rel: 'self',
          type: 'application/activity+json',
          href: actorId,
        },
      ],
    });
  });

  app.get('/actors/:username', async (c) => {
    const username = c.req.param('username');
    const actor = await lookupActor(username);
    if (!actor) return c.json({ error: 'unknown actor' }, 404);
    const doc = buildActor(origin(c), actor);
    return new Response(JSON.stringify(doc), {
      status: 200,
      headers: { 'Content-Type': 'application/activity+json' },
    });
  });

  // Inbox: verify the HTTP Signature (draft-cavage-12) before routing the
  // activity to the dispatcher. Unsigned / bad-sig / digest-mismatch
  // deliveries are rejected with 401.
  app.post('/actors/:username/inbox', async (c) => {
    const actor = await lookupActor(c.req.param('username'));
    if (!actor) return c.json({ error: 'unknown actor' }, 404);

    const rawBody = Buffer.from(await c.req.arrayBuffer());
    const headers: Record<string, string | undefined> = {};
    for (const [name, value] of c.req.raw.headers) {
      headers[name.toLowerCase()] = value;
    }
    const url = new URL(c.req.url);
    const result = await verifyRequestSignature({
      method: c.req.method,
      path: url.pathname + url.search,
      headers,
      body: rawBody,
      fetchPublicKeyPem,
    });
    if (!result.ok) {
      log.warn({ reason: result.reason }, 'inbox: signature verification failed');
      return c.json({ error: 'signature verification failed', reason: result.reason }, 401);
    }
    let payload: unknown = null;
    try {
      payload = rawBody.length > 0 ? JSON.parse(rawBody.toString('utf8')) : null;
    } catch {
      return c.json({ error: 'invalid JSON body' }, 400);
    }
    if (!payload || typeof payload !== 'object') {
      return c.json({ error: 'empty or non-object activity' }, 400);
    }
    const outcome = await dispatchActivity(payload as Record<string, unknown>, activityHandlers, {
      signerKeyId: result.keyId,
      log,
    });
    log.info({ keyId: result.keyId, outcome }, 'inbox delivery verified');
    return c.json({ accepted: true, outcome }, 202);
  });

  // Minimal user registration. Phase 1: creates an actor row with a fresh
  // keypair and an argon2id password hash. Login / sessions are follow-up
  // work — for now, the client is expected to remember the password and the
  // operator uses it to mint signed outbox deliveries manually.
  app.post('/api/register', async (c) => {
    if (!options.db || !options.publicOrigin) {
      return c.json({ error: 'registration not configured (no DB)' }, 501);
    }
    let input: unknown;
    try {
      input = await c.req.json();
    } catch {
      return c.json({ error: 'invalid JSON body' }, 400);
    }
    if (!input || typeof input !== 'object') {
      return c.json({ error: 'expected object body' }, 400);
    }
    const { username, password, displayName, bio } = input as Record<string, unknown>;
    if (typeof username !== 'string' || typeof password !== 'string') {
      return c.json({ error: 'username and password are required strings' }, 400);
    }
    const result = await registerLocalActor({
      db: options.db,
      username,
      password,
      domain: new URL(options.publicOrigin).host,
      publicOrigin: options.publicOrigin,
      displayName: typeof displayName === 'string' ? displayName : undefined,
      bio: typeof bio === 'string' ? bio : undefined,
    });
    if (!result.ok) {
      const status = result.reason === 'username_taken' ? 409 : 400;
      return c.json({ error: result.reason }, status);
    }
    return c.json({ actor: result.actorUri }, 201);
  });

  // Outbox: client submits a JSON-LD activity, we persist it and fan out
  // signed deliveries. Guarded by a shared-secret bearer token so random
  // traffic can't publish on behalf of the stub actor.
  app.post('/actors/:username/outbox', async (c) => {
    if (!options.db || !options.publicOrigin) {
      return c.json({ error: 'outbox not configured (no DB)' }, 501);
    }
    if (!options.outboxSecret) {
      return c.json({ error: 'outbox disabled (set TRAILFED_OUTBOX_SECRET)' }, 501);
    }
    const auth = c.req.header('authorization');
    if (auth !== `Bearer ${options.outboxSecret}`) {
      return c.json({ error: 'unauthorized' }, 401);
    }
    const actor = await lookupActor(c.req.param('username'));
    if (!actor) return c.json({ error: 'unknown actor' }, 404);

    let activityInput: unknown;
    try {
      activityInput = await c.req.json();
    } catch {
      return c.json({ error: 'invalid JSON body' }, 400);
    }
    if (!activityInput || typeof activityInput !== 'object') {
      return c.json({ error: 'activity must be a JSON object' }, 400);
    }
    // If this is a Create Place, persist the place locally first so it
    // appears on our own map immediately and gets a stable URI we can reuse
    // as the object id when fanning out.
    const asObj = activityInput as Record<string, unknown>;
    if (
      asObj.type === 'Create' &&
      asObj.object &&
      typeof asObj.object === 'object' &&
      (asObj.object as { type?: string }).type === 'Place'
    ) {
      const place = asObj.object as Record<string, unknown>;
      if (!place.id) {
        place.id = `${options.publicOrigin}/places/${crypto.randomUUID()}`;
      }
      await persistPlaceFromActivity({
        db: options.db,
        place: place as unknown as Parameters<typeof persistPlaceFromActivity>[0]['place'],
        actorUri: `${options.publicOrigin}/actors/${actor.username}`,
        originActorId: actor.id,
        isLocal: true,
        log,
      });
    }

    const result = await publishFromOutbox({
      db: options.db,
      actor,
      activityInput: activityInput as Record<string, unknown>,
      publicOrigin: options.publicOrigin,
      log,
    });
    return c.json(result, 201);
  });

  // GeoJSON FeatureCollection of POIs for the web map. Phase 0/1: simple
  // unfiltered SELECT; bbox/zoom filtering comes later.
  app.get('/api/places', async (c) => {
    const { db, sql: closer } = createDbClient();
    try {
      const rows = (await db.execute(sql`
        SELECT
          id::text AS id,
          category,
          names->>'default' AS name,
          ST_X(geom::geometry) AS lon,
          ST_Y(geom::geometry) AS lat,
          source_type
        FROM places
        WHERE is_active = true
        LIMIT 500
      `)) as unknown as Array<{
        id: string;
        category: string;
        name: string | null;
        lon: number;
        lat: number;
        source_type: string | null;
      }>;
      return c.json({
        type: 'FeatureCollection',
        features: rows.map((r) => ({
          type: 'Feature',
          id: r.id,
          geometry: { type: 'Point', coordinates: [Number(r.lon), Number(r.lat)] },
          properties: {
            category: r.category,
            name: r.name ?? 'Unnamed',
            source: r.source_type,
          },
        })),
      });
    } finally {
      await closer.end({ timeout: 5 });
    }
  });

  app.get('/nodeinfo/2.0', (c) =>
    c.json({
      version: '2.0',
      software: { name: 'trailfed', version: '0.0.0' },
      protocols: ['activitypub'],
      services: { inbound: [], outbound: [] },
      openRegistrations: false,
      usage: { users: { total: 1 } },
      metadata: { phase: 'scaffold' },
    }),
  );

  return app;
}

/**
 * Build an ActorLookup backed by the `actors` table.
 */
export function createDbActorLookup(db: DbClient, domain: string): ActorLookup {
  return async (username) => findLocalActorByUsername(db, username, domain);
}

/**
 * Boot-time wiring: if `DATABASE_URL` is set, open the DB, ensure a `stub`
 * actor exists, and return a DB-backed lookup. Otherwise the in-memory
 * fallback is used. Exposed from the module so the process bootstrap below
 * and future integration tests can share the path.
 */
export interface BootstrapResult {
  lookup: ActorLookup;
  db: DbClient;
  publicOrigin: string;
}

export async function bootstrapActorLookup(): Promise<BootstrapResult | null> {
  if (!process.env.DATABASE_URL) return null;
  const { db } = createDbClient();
  const publicOrigin = process.env.PUBLIC_ORIGIN ?? '';
  if (!publicOrigin) {
    log.warn('PUBLIC_ORIGIN not set — skipping DB-backed actor seeding');
    return null;
  }
  const domain = new URL(publicOrigin).host;
  await ensureLocalActor(db, {
    username: 'stub',
    domain,
    publicOrigin,
    displayName: 'TrailFed stub actor',
    bio: 'Phase 0 placeholder actor for the TrailFed reference instance.',
  });
  log.info({ domain }, 'seeded local stub actor');
  return { lookup: createDbActorLookup(db, domain), db, publicOrigin };
}

export const app = createApp({});

// Re-export the build helper so old tests (actor.test.ts) still import
// `buildStubActor` from the federation module — intentionally unchanged.
export { buildStubActor };

if (process.env.NODE_ENV !== 'test') {
  bootstrapActorLookup()
    .then((boot) => {
      const port = Number(process.env.PORT ?? 3000);
      const serverApp = boot
        ? createApp({
            lookupActor: boot.lookup,
            db: boot.db,
            publicOrigin: boot.publicOrigin,
            outboxSecret: process.env.TRAILFED_OUTBOX_SECRET,
          })
        : app;
      serve({ fetch: serverApp.fetch, port, hostname: '0.0.0.0' }, (info: { port: number }) => {
        log.info({ port: info.port, dbBacked: Boolean(boot) }, 'trailfed server listening');
      });
    })
    .catch((err) => {
      log.error({ err }, 'failed to bootstrap actor lookup');
      process.exit(1);
    });
}
