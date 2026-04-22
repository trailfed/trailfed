// SPDX-License-Identifier: AGPL-3.0-or-later

import { describe, expect, it } from 'vitest';

import { createApp } from '../index.js';
import { buildStubActor, generateActorKeyPair } from './actor.js';

const keys = generateActorKeyPair();

describe('buildStubActor', () => {
  it('produces AP-shaped JSON-LD with stable URLs', () => {
    const actor = buildStubActor('https://camp.trailfed.org', keys.publicKeyPem);
    expect(actor.id).toBe('https://camp.trailfed.org/actors/stub');
    expect(actor.inbox).toBe('https://camp.trailfed.org/actors/stub/inbox');
    expect(actor.outbox).toBe('https://camp.trailfed.org/actors/stub/outbox');
    expect(actor.type).toBe('Person');
    expect(actor.preferredUsername).toBe('stub');
    expect(actor.publicKey.owner).toBe(actor.id);
    expect(actor.publicKey.publicKeyPem).toContain('BEGIN PUBLIC KEY');
    expect(actor.publicKey.publicKeyPem.length).toBeGreaterThan(0);
  });
});

describe('HTTP endpoints', () => {
  const app = createApp(keys);

  it('GET /actors/stub returns ActivityPub Person JSON-LD', async () => {
    const res = await app.request('https://camp.trailfed.org/actors/stub');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/activity+json');
    const body = (await res.json()) as { '@context': unknown[]; id: string; type: string };
    expect(body['@context']).toContain('https://www.w3.org/ns/activitystreams');
    expect(body.id).toBe('https://camp.trailfed.org/actors/stub');
    expect(body.type).toBe('Person');
  });

  it('WebFinger points acct:stub@host at the actor id', async () => {
    const res = await app.request(
      'https://camp.trailfed.org/.well-known/webfinger?resource=acct:stub@camp.trailfed.org',
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      subject: string;
      links: { rel: string; type: string; href: string }[];
    };
    expect(body.subject).toBe('acct:stub@camp.trailfed.org');
    const self = body.links.find((l) => l.rel === 'self');
    expect(self?.href).toBe('https://camp.trailfed.org/actors/stub');
  });

  it('WebFinger rejects unknown resources with 404', async () => {
    const res = await app.request(
      'https://camp.trailfed.org/.well-known/webfinger?resource=acct:someone@elsewhere.example',
    );
    expect(res.status).toBe(404);
  });

  it('inbox rejects unsigned POSTs with 401', async () => {
    const res = await app.request('https://camp.trailfed.org/actors/stub/inbox', {
      method: 'POST',
      headers: { 'content-type': 'application/activity+json' },
      body: JSON.stringify({ type: 'Create' }),
    });
    expect(res.status).toBe(401);
  });

  it('inbox accepts signed POSTs with 202', async () => {
    const res = await app.request('https://camp.trailfed.org/actors/stub/inbox', {
      method: 'POST',
      headers: {
        'content-type': 'application/activity+json',
        signature: 'keyId="test",headers="(request-target)",signature="x"',
      },
      body: JSON.stringify({ type: 'Create' }),
    });
    expect(res.status).toBe(202);
  });

  it('/nodeinfo/2.0 reports one user', async () => {
    const res = await app.request('https://camp.trailfed.org/nodeinfo/2.0');
    const body = (await res.json()) as { usage: { users: { total: number } } };
    expect(body.usage.users.total).toBe(1);
  });
});
