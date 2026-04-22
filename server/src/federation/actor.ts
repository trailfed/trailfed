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
 * Build the hardcoded "stub" actor for this instance.
 *
 * TODO(phase-1): persist actors in DB once #4 merges; replace this with a
 * Fedify `Federation` + actor dispatcher reading from `actors` table.
 */
export function buildStubActor(origin: string, publicKeyPem: string): StubActor {
  const id = `${origin}/actors/stub`;
  return {
    '@context': ['https://www.w3.org/ns/activitystreams', 'https://w3id.org/security/v1'],
    id,
    type: 'Person',
    preferredUsername: 'stub',
    name: 'TrailFed stub actor',
    summary:
      'Phase 0 placeholder actor for the TrailFed reference instance. Real user accounts land in Phase 1.',
    inbox: `${id}/inbox`,
    outbox: `${id}/outbox`,
    followers: `${id}/followers`,
    following: `${id}/following`,
    publicKey: {
      id: `${id}#main-key`,
      owner: id,
      publicKeyPem,
    },
  };
}
