// SPDX-License-Identifier: AGPL-3.0-or-later

import { hash as argon2Hash } from '@node-rs/argon2';
import { and, eq } from 'drizzle-orm';

import type { DbClient } from '../db/client.js';
import { actors } from '../db/schema.js';
import { generateActorKeys } from './keys.js';

/**
 * Register a new local actor (username + password). Enforces a minimum
 * password length and rejects duplicates for the same `(username, domain)`.
 *
 * Phase 1 scope: creates the row with a fresh RSA keypair and an Argon2id
 * password hash. Session / token issuance is out of scope — the caller gets
 * the actor URI and is expected to know the password for any future login.
 */
export async function registerLocalActor(params: {
  db: DbClient;
  username: string;
  password: string;
  domain: string;
  publicOrigin: string;
  displayName?: string;
  bio?: string;
}): Promise<
  | { ok: true; actorUri: string }
  | { ok: false; reason: 'username_taken' | 'invalid_username' | 'weak_password' }
> {
  if (!/^[a-z0-9_]{3,32}$/i.test(params.username)) {
    return { ok: false, reason: 'invalid_username' };
  }
  if (params.password.length < 10) {
    return { ok: false, reason: 'weak_password' };
  }

  const existing = await params.db
    .select({ id: actors.id })
    .from(actors)
    .where(and(eq(actors.username, params.username), eq(actors.domain, params.domain)))
    .limit(1);
  if (existing[0]) {
    return { ok: false, reason: 'username_taken' };
  }

  const keys = await generateActorKeys();
  // Argon2id defaults from OWASP guidance (m=19 MiB, t=2, p=1) — safe for
  // interactive login and fast enough for a signup handler.
  const passwordHash = await argon2Hash(params.password, {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  });

  const actorId = `${params.publicOrigin}/actors/${params.username}`;
  await params.db.insert(actors).values({
    uri: actorId,
    username: params.username,
    domain: params.domain,
    displayName: params.displayName ?? null,
    bio: params.bio ?? null,
    publicKeyJwk: keys.publicKeyJwk,
    privateKeyJwk: keys.privateKeyJwk,
    passwordHash,
    isLocal: true,
    inboxUrl: `${actorId}/inbox`,
    outboxUrl: `${actorId}/outbox`,
    followersUrl: `${actorId}/followers`,
    followingUrl: `${actorId}/following`,
  });

  return { ok: true, actorUri: actorId };
}
