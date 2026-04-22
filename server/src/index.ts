// SPDX-License-Identifier: AGPL-3.0-or-later

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { pino } from 'pino';

const log = pino({ name: 'trailfed-server' });

const app = new Hono();

// When behind a reverse proxy (nginx/Caddy), use PUBLIC_ORIGIN so WebFinger
// and NodeInfo advertise the correct scheme/host regardless of the internal
// URL the request arrived on.
const publicOrigin = process.env.PUBLIC_ORIGIN ?? '';
const origin = (c: { req: { url: string } }) => publicOrigin || new URL(c.req.url).origin;

app.get('/', (c) =>
  c.json({
    name: 'trailfed',
    version: '0.0.0',
    phase: 'Phase 0 — scaffold',
    docs: 'https://github.com/trailfed/trailfed',
  }),
);

app.get('/healthz', (c) => c.json({ ok: true }));

// Minimal WebFinger stub so operators can verify the scaffold end-to-end.
// Real federation lives in Phase 1; see docs/adr/0001-backend-stack.md.
app.get('/.well-known/webfinger', (c) => {
  const resource = c.req.query('resource');
  if (!resource) {
    return c.json({ error: 'missing resource query parameter' }, 400);
  }
  return c.json({
    subject: resource,
    links: [
      {
        rel: 'self',
        type: 'application/activity+json',
        href: `${origin(c)}/users/stub`,
      },
    ],
  });
});

app.get('/nodeinfo/2.0', (c) =>
  c.json({
    version: '2.0',
    software: { name: 'trailfed', version: '0.0.0' },
    protocols: ['activitypub'],
    services: { inbound: [], outbound: [] },
    openRegistrations: false,
    usage: { users: { total: 0 } },
    metadata: { phase: 'scaffold' },
  }),
);

const port = Number(process.env.PORT ?? 3000);

serve({ fetch: app.fetch, port, hostname: '0.0.0.0' }, (info: { port: number }) => {
  log.info({ port: info.port }, 'trailfed server listening');
});
