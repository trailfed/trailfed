// SPDX-License-Identifier: AGPL-3.0-or-later

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { pino } from 'pino';

import {
  buildStubActor,
  generateActorKeyPair,
  publicKeyPemFromPrivate,
} from './federation/actor.js';
import { fetchActorPublicKeyPem, verifyRequestSignature } from './federation/http-signature.js';
import { dispatchActivity, type ActivityHandler } from './federation/inbox.js';

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

// Activity dispatcher — Phase 1 handlers land here as we implement them
// (Follow → Accept, Create Place, …). For now every verified delivery is
// accepted and logged; unknown types are dropped with a log line.
const defaultActivityHandlers: Record<string, ActivityHandler> = {};

export interface CreateAppOptions {
  keys?: { publicKeyPem: string };
  activityHandlers?: Record<string, ActivityHandler>;
  fetchPublicKeyPem?: (keyId: string) => Promise<string | null>;
}

export function createApp(options: CreateAppOptions = {}): Hono {
  const keys = options.keys ?? actorKeys;
  const activityHandlers = options.activityHandlers ?? defaultActivityHandlers;
  const fetchPublicKeyPem = options.fetchPublicKeyPem ?? fetchActorPublicKeyPem;
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

  // Inbox: verify the HTTP Signature (draft-cavage-12) before routing the
  // activity to the dispatcher. Unsigned / bad-sig / digest-mismatch deliveries
  // are rejected with 401.
  app.post('/actors/stub/inbox', async (c) => {
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

export const app = createApp({});

if (process.env.NODE_ENV !== 'test') {
  const port = Number(process.env.PORT ?? 3000);
  serve({ fetch: app.fetch, port, hostname: '0.0.0.0' }, (info: { port: number }) => {
    log.info({ port: info.port }, 'trailfed server listening');
  });
}
