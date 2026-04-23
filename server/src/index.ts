// SPDX-License-Identifier: AGPL-3.0-or-later

import { serve } from '@hono/node-server';
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
import { fetchActorPublicKeyPem, verifyRequestSignature } from './federation/http-signature.js';
import { dispatchActivity, type ActivityHandler } from './federation/inbox.js';

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
  const activityHandlers = options.activityHandlers ?? defaultActivityHandlers;
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
export async function bootstrapActorLookup(): Promise<ActorLookup | null> {
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
  return createDbActorLookup(db, domain);
}

export const app = createApp({});

// Re-export the build helper so old tests (actor.test.ts) still import
// `buildStubActor` from the federation module — intentionally unchanged.
export { buildStubActor };

if (process.env.NODE_ENV !== 'test') {
  bootstrapActorLookup()
    .then((lookup) => {
      const port = Number(process.env.PORT ?? 3000);
      const serverApp = lookup ? createApp({ lookupActor: lookup }) : app;
      serve({ fetch: serverApp.fetch, port, hostname: '0.0.0.0' }, (info: { port: number }) => {
        log.info({ port: info.port, dbBacked: Boolean(lookup) }, 'trailfed server listening');
      });
    })
    .catch((err) => {
      log.error({ err }, 'failed to bootstrap actor lookup');
      process.exit(1);
    });
}
