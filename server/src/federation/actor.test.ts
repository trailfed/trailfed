// SPDX-License-Identifier: AGPL-3.0-or-later

import { describe, expect, it } from 'vitest';

import { createApp, type ActorLookup } from '../index.js';
import { buildStubActor, generateActorKeyPair } from './actor.js';

const keys = generateActorKeyPair();

const stubLookup: ActorLookup = async (username) =>
  username === 'stub'
    ? {
        id: 0n,
        username: 'stub',
        domain: 'camp.trailfed.org',
        displayName: 'TrailFed stub actor',
        bio: null,
        publicKeyPem: keys.publicKeyPem,
        privateKeyPem: keys.privateKeyPem,
      }
    : null;

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
  const app = createApp({ lookupActor: stubLookup });

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

  it('inbox rejects bogus signatures with 401', async () => {
    // Full signature verification is covered in http-signature.test.ts; this
    // test just pins that the inbox refuses a structurally-present but
    // invalid signature header (previously it would 202 anything signed-ish).
    const res = await app.request('https://camp.trailfed.org/actors/stub/inbox', {
      method: 'POST',
      headers: {
        'content-type': 'application/activity+json',
        signature: 'keyId="test",headers="(request-target)",signature="x"',
      },
      body: JSON.stringify({ type: 'Create' }),
    });
    expect(res.status).toBe(401);
  });

  it('serves arbitrary usernames from the lookup', async () => {
    const aliceKeys = generateActorKeyPair();
    const multiLookup: ActorLookup = async (u) =>
      u === 'alice'
        ? {
            id: 1n,
            username: 'alice',
            domain: 'camp.trailfed.org',
            displayName: 'Alice',
            bio: 'test',
            publicKeyPem: aliceKeys.publicKeyPem,
            privateKeyPem: aliceKeys.privateKeyPem,
          }
        : null;
    const multiApp = createApp({ lookupActor: multiLookup });

    const aliceRes = await multiApp.request('https://camp.trailfed.org/actors/alice');
    expect(aliceRes.status).toBe(200);
    const aliceBody = (await aliceRes.json()) as { id: string; preferredUsername: string };
    expect(aliceBody.id).toBe('https://camp.trailfed.org/actors/alice');
    expect(aliceBody.preferredUsername).toBe('alice');

    const unknownRes = await multiApp.request('https://camp.trailfed.org/actors/bob');
    expect(unknownRes.status).toBe(404);

    const wfRes = await multiApp.request(
      'https://camp.trailfed.org/.well-known/webfinger?resource=acct:bob@camp.trailfed.org',
    );
    expect(wfRes.status).toBe(404);
  });

  it('/nodeinfo/2.0 reports one user', async () => {
    const res = await app.request('https://camp.trailfed.org/nodeinfo/2.0');
    const body = (await res.json()) as { usage: { users: { total: number } } };
    expect(body.usage.users.total).toBe(1);
  });
});
