// SPDX-License-Identifier: AGPL-3.0-or-later

import { createPrivateKey, createPublicKey, generateKeyPairSync } from 'node:crypto';

/**
 * A minimal ActivityPub `Person` actor, shaped to match the Fedify `Actor`
 * contract so that when we move to the full Fedify runtime in Phase 1 we can
 * swap the implementation without changing callers.
 *
 * This is intentionally plain JSON-LD rather than a Fedify `Person` instance:
 * Fedify requires Node 22+ and a Federation object tied to a persistent key
 * store; for the Phase 0 stub we only need a single hardcoded actor.
 */
export interface StubActor {
  readonly '@context': readonly (string | Record<string, unknown>)[];
  readonly id: string;
  readonly type: 'Person';
  readonly preferredUsername: string;
  readonly name: string;
  readonly summary: string;
  readonly inbox: string;
  readonly outbox: string;
  readonly followers: string;
  readonly following: string;
  readonly publicKey: {
    readonly id: string;
    readonly owner: string;
    readonly publicKeyPem: string;
  };
}

export interface ActorKeyPair {
  privateKeyPem: string;
  publicKeyPem: string;
}

/**
 * Generate a fresh RSA-2048 keypair in PEM form. RSA (rather than Ed25519) is
 * required for HTTP Signatures cavage-12 interop with Mastodon et al.
 */
export function generateActorKeyPair(): ActorKeyPair {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  return { publicKeyPem: publicKey, privateKeyPem: privateKey };
}

/**
 * Derive a public PEM from a private PEM (used when loading
 * ACTOR_PRIVATE_KEY_PEM from the environment).
 */
export function publicKeyPemFromPrivate(privateKeyPem: string): string {
  const priv = createPrivateKey(privateKeyPem);
  return createPublicKey(priv).export({ type: 'spki', format: 'pem' }).toString();
}

/**
 * Build an ActivityPub `Person` actor JSON-LD document from a local actor
 * record. URLs are assembled from the incoming request origin so the same DB
 * row serves correctly behind a reverse proxy with `PUBLIC_ORIGIN` set or in
 * dev where the origin varies.
 */
export function buildActor(
  origin: string,
  actor: {
    username: string;
    displayName?: string | null;
    bio?: string | null;
    publicKeyPem: string;
  },
): StubActor {
  const id = `${origin}/actors/${actor.username}`;
  return {
    '@context': ['https://www.w3.org/ns/activitystreams', 'https://w3id.org/security/v1'],
    id,
    type: 'Person',
    preferredUsername: actor.username,
    name: actor.displayName ?? actor.username,
    summary: actor.bio ?? '',
    inbox: `${id}/inbox`,
    outbox: `${id}/outbox`,
    followers: `${id}/followers`,
    following: `${id}/following`,
    publicKey: {
      id: `${id}#main-key`,
      owner: id,
      publicKeyPem: actor.publicKeyPem,
    },
  };
}

/**
 * Compatibility wrapper: the original hardcoded `stub` actor. Still used by
 * tests that don't touch the DB; new code should go through `buildActor`.
 */
export function buildStubActor(origin: string, publicKeyPem: string): StubActor {
  return buildActor(origin, {
    username: 'stub',
    displayName: 'TrailFed stub actor',
    bio: 'Phase 0 placeholder actor for the TrailFed reference instance. Real user accounts land in Phase 1.',
    publicKeyPem,
  });
}
