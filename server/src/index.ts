// SPDX-License-Identifier: AGPL-3.0-or-later

import { serve } from '@hono/node-server';
import { federation as fedifyMiddleware } from '@fedify/hono';
import { sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { pino } from 'pino';

import { createDbClient, type DbClient } from './db/client.js';
import { ensureLocalActor, findLocalActorByUsername } from './db/actors.js';
import {
  createAppFederation,
  publishFromOutbox,
  type FederationContext,
} from './federation/fedify.js';
import { addBlock, isDomainBlocked, listBlocks, listRecentFlags } from './federation/moderation.js';
import { registerLocalActor } from './federation/registration.js';

const log = pino({ name: 'trailfed-server' });

export interface CreateAppOptions {
  db?: DbClient;
  publicOrigin?: string;
  /** Shared-secret bearer token for outbox + moderation endpoints. */
  outboxSecret?: string;
}

export function createApp(options: CreateAppOptions = {}): Hono {
  const app = new Hono();

  // Health and root.
  app.get('/', (c) =>
    c.json({
      name: 'trailfed',
      version: '0.0.0',
      phase: 'Phase 1',
      docs: 'https://github.com/trailfed/trailfed',
    }),
  );
  app.get('/healthz', (c) => c.json({ ok: true }));

  // Wire Fedify (ActivityPub, WebFinger, HTTP Signatures, NodeInfo,
  // /actors/:u, /actors/:u/inbox, /actors/:u/outbox, /.well-known/webfinger,
  // /nodeinfo/*). All federation-layer crypto and dispatch is handled by
  // the library — we only provide persistence callbacks.
  if (options.db && options.publicOrigin) {
    const fed = createAppFederation(options.publicOrigin);
    app.use(
      '*',
      fedifyMiddleware(
        fed,
        (): FederationContext => ({
          db: options.db!,
          publicOrigin: options.publicOrigin!,
          log,
        }),
      ),
    );

    // Inbox block-list: check incoming inboxes before Fedify processes the
    // signed payload. Fedify doesn't expose a pre-dispatch hook directly,
    // so we shim with a thin middleware that inspects the signature header.
    app.use('/actors/:username/inbox', async (c, next) => {
      const sig = c.req.header('signature');
      if (!sig) return next();
      const keyIdMatch = /keyId="([^"]+)"/.exec(sig);
      if (!keyIdMatch) return next();
      try {
        const host = new URL(keyIdMatch[1]).host;
        if (options.db && (await isDomainBlocked(options.db, host))) {
          log.warn({ host }, 'inbox: blocked domain, dropping');
          return c.json({ error: 'peer blocked' }, 403);
        }
      } catch {
        // Malformed keyId — let Fedify 400 it.
      }
      return next();
    });

    // Phase 1 client outbox: our admin-shared-secret endpoint for posting
    // as a local actor. Real user auth is follow-up work.
    app.post('/actors/:username/publish', async (c) => {
      if (!options.outboxSecret) return c.json({ error: 'not configured' }, 501);
      if (c.req.header('authorization') !== `Bearer ${options.outboxSecret}`) {
        return c.json({ error: 'unauthorized' }, 401);
      }
      const host = new URL(options.publicOrigin!).host;
      const actor = await findLocalActorByUsername(options.db!, c.req.param('username'), host);
      if (!actor) return c.json({ error: 'unknown actor' }, 404);

      let input: unknown;
      try {
        input = await c.req.json();
      } catch {
        return c.json({ error: 'invalid JSON body' }, 400);
      }
      if (!input || typeof input !== 'object') {
        return c.json({ error: 'expected object body' }, 400);
      }
      const result = await publishFromOutbox({
        fed,
        db: options.db!,
        publicOrigin: options.publicOrigin!,
        username: actor.username,
        actorId: actor.id,
        activityInput: input as Record<string, unknown>,
        log,
      });
      return c.json(result, 201);
    });
  }

  // User registration.
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

  // GeoJSON FeatureCollection of POIs for the web map.
  app.get('/api/places', async (c) => {
    if (!options.db) return c.json({ type: 'FeatureCollection', features: [] });
    const rows = (await options.db.execute(sql`
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
  });

  // Moderation admin endpoints — same shared-secret guard as /publish.
  const requireAdmin = (auth: string | undefined) =>
    options.outboxSecret && auth === `Bearer ${options.outboxSecret}`;

  app.get('/api/moderation/flags', async (c) => {
    if (!options.db) return c.json({ error: 'not configured' }, 501);
    if (!requireAdmin(c.req.header('authorization'))) {
      return c.json({ error: 'unauthorized' }, 401);
    }
    return c.json({ flags: await listRecentFlags(options.db) });
  });
  app.get('/api/moderation/blocks', async (c) => {
    if (!options.db) return c.json({ error: 'not configured' }, 501);
    if (!requireAdmin(c.req.header('authorization'))) {
      return c.json({ error: 'unauthorized' }, 401);
    }
    return c.json({ blocks: await listBlocks(options.db) });
  });
  app.post('/api/moderation/blocks', async (c) => {
    if (!options.db) return c.json({ error: 'not configured' }, 501);
    if (!requireAdmin(c.req.header('authorization'))) {
      return c.json({ error: 'unauthorized' }, 401);
    }
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: 'invalid JSON body' }, 400);
    }
    const { domain } = (body ?? {}) as { domain?: unknown };
    if (typeof domain !== 'string' || domain.length === 0) {
      return c.json({ error: 'domain required' }, 400);
    }
    await addBlock(options.db, domain);
    log.info({ domain }, 'moderation: domain added to block-list');
    return c.json({ ok: true, domain }, 201);
  });

  return app;
}

export async function bootstrapApp(): Promise<Hono> {
  if (!process.env.DATABASE_URL) return createApp();
  const { db } = createDbClient();
  const publicOrigin = process.env.PUBLIC_ORIGIN ?? '';
  if (!publicOrigin) {
    log.warn('PUBLIC_ORIGIN not set — federation endpoints disabled');
    return createApp();
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
  return createApp({
    db,
    publicOrigin,
    outboxSecret: process.env.TRAILFED_OUTBOX_SECRET,
  });
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
if (process.env.NODE_ENV !== 'test') {
  bootstrapApp()
    .then((serverApp) => {
      const port = Number(process.env.PORT ?? 3000);
      serve({ fetch: serverApp.fetch, port, hostname: '0.0.0.0' }, (info: { port: number }) => {
        log.info({ port: info.port }, 'trailfed server listening');
      });
    })
    .catch((err) => {
      log.error({ err }, 'failed to boot');
      process.exit(1);
    });
}

export const app = createApp();
