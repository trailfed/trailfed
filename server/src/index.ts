// SPDX-License-Identifier: AGPL-3.0-or-later

import { serve } from '@hono/node-server';
import { sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { pino } from 'pino';

import { createDbClient } from './db/client.js';
import {
  buildStubActor,
  generateActorKeyPair,
  publicKeyPemFromPrivate,
} from './federation/actor.js';

const log = pino({ name: 'trailfed-server' });

// Load the actor keypair from env if available, otherwise mint a fresh one.
// A fresh key at every boot invalidates outstanding federation signatures,
// so operators should set ACTOR_PRIVATE_KEY_PEM in production.
function loadActorKeys(): { privateKeyPem: string; publicKeyPem: string } {
  const fromEnv = process.env.ACTOR_PRIVATE_KEY_PEM;
  if (fromEnv && fromEnv.trim().length > 0) {
    const privateKeyPem = fromEnv.replace(/\\n/g, '\n');
    return { privateKeyPem, publicKeyPem: publicKeyPemFromPrivate(privateKeyPem) };
  }
  log.warn(
    'ACTOR_PRIVATE_KEY_PEM not set — generating an ephemeral RSA keypair. ' +
      'Remote followers will need to refetch the actor after restart.',
  );
  return generateActorKeyPair();
}

const actorKeys = loadActorKeys();

export function createApp(keys: { publicKeyPem: string } = actorKeys): Hono {
  const app = new Hono();

  // When behind a reverse proxy (nginx/Caddy), use PUBLIC_ORIGIN so WebFinger
  // and NodeInfo advertise the correct scheme/host regardless of the internal
  // URL the request arrived on.
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

  // WebFinger resolves `acct:stub@<instance-host>` to the stub actor.
  app.get('/.well-known/webfinger', (c) => {
    const resource = c.req.query('resource');
    if (!resource) {
      return c.json({ error: 'missing resource query parameter' }, 400);
    }
    const expected = `acct:stub@${stubHost(c)}`;
    if (resource !== expected) {
      return c.json({ error: 'unknown resource' }, 404);
    }
    const actorId = `${origin(c)}/actors/stub`;
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

  app.get('/actors/stub', (c) => {
    const actor = buildStubActor(origin(c), keys.publicKeyPem);
    return new Response(JSON.stringify(actor), {
      status: 200,
      headers: { 'Content-Type': 'application/activity+json' },
    });
  });

  // Minimal inbox. We log the payload and 202 it; HTTP Signature verification
  // is Phase 1 scope, but we already reject unsigned deliveries so we don't
  // silently accept bogus traffic.
  app.post('/actors/stub/inbox', async (c) => {
    if (!c.req.header('signature')) {
      return c.json({ error: 'unsigned request' }, 401);
    }
    let payload: unknown = null;
    try {
      payload = await c.req.json();
    } catch {
      payload = null;
    }
    log.info({ payload }, 'inbox delivery (not verified)');
    return c.json({ accepted: true }, 202);
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

export const app = createApp();

if (process.env.NODE_ENV !== 'test') {
  const port = Number(process.env.PORT ?? 3000);
  serve({ fetch: app.fetch, port, hostname: '0.0.0.0' }, (info: { port: number }) => {
    log.info({ port: info.port }, 'trailfed server listening');
  });
}
