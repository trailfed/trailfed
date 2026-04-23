// SPDX-License-Identifier: AGPL-3.0-or-later

import { and, eq } from 'drizzle-orm';

import { generateActorKeyPair } from '../federation/actor.js';

import type { DbClient } from './client.js';
import { actors } from './schema.js';

/**
 * A local actor row, narrowed to the fields federation cares about. Fields
 * not in this type (e.g. avatar, bio) may still be present in the DB row —
 * we just don't rely on them at the federation layer.
 */
export interface LocalActorRecord {
  id: bigint;
  username: string;
  domain: string;
  displayName: string | null;
  bio: string | null;
  publicKeyPem: string;
  privateKeyPem: string;
}

/**
 * Insert-or-fetch a remote actor by its ActivityPub URI. Used when we receive
 * a Follow from a host we haven't seen before — we need a row so the
 * `follows` FK has something to reference. Key material isn't fetched here
 * (HTTP Signature verification already fetched it); we can lazily pull it
 * on outbound deliveries if needed.
 */
export async function ensureRemoteActor(
  db: DbClient,
  params: {
    uri: string;
    username: string;
    domain: string;
    inboxUrl?: string;
  },
): Promise<{ id: bigint; uri: string }> {
  const existing = await db
    .select({ id: actors.id, uri: actors.uri })
    .from(actors)
    .where(eq(actors.uri, params.uri))
    .limit(1);
  if (existing[0]) return { id: existing[0].id, uri: existing[0].uri };

  const inserted = await db
    .insert(actors)
    .values({
      uri: params.uri,
      username: params.username,
      domain: params.domain,
      isLocal: false,
      inboxUrl: params.inboxUrl ?? null,
    })
    .returning({ id: actors.id, uri: actors.uri });
  return inserted[0];
}

export async function findLocalActorByUsername(
  db: DbClient,
  username: string,
  domain: string,
): Promise<LocalActorRecord | null> {
  const rows = await db
    .select()
    .from(actors)
    .where(and(eq(actors.username, username), eq(actors.domain, domain), eq(actors.isLocal, true)))
    .limit(1);
  const row = rows[0];
  if (!row || !row.publicKey || !row.privateKey) return null;
  return {
    id: row.id,
    username: row.username,
    domain: row.domain,
    displayName: row.displayName,
    bio: row.bio,
    publicKeyPem: row.publicKey,
    privateKeyPem: row.privateKey,
  };
}

/**
 * Ensure a local actor exists for `(username, domain)`. If missing, mint a
 * fresh RSA keypair and insert a row. Idempotent — safe to call on every
 * boot.
 *
 * `publicOrigin` is used to seed the stable URI / inbox / outbox columns.
 * The handlers still build URLs per-request from the incoming origin, so if
 * `PUBLIC_ORIGIN` changes the row's `uri` drifts — that's a known Phase 1
 * limitation; `uri` should be treated as a hint, not the source of truth.
 */
export async function ensureLocalActor(
  db: DbClient,
  params: {
    username: string;
    domain: string;
    publicOrigin: string;
    displayName?: string;
    bio?: string;
  },
): Promise<LocalActorRecord> {
  const existing = await findLocalActorByUsername(db, params.username, params.domain);
  if (existing) return existing;

  const keys = generateActorKeyPair();
  const actorId = `${params.publicOrigin}/actors/${params.username}`;
  const inserted = await db
    .insert(actors)
    .values({
      uri: actorId,
      username: params.username,
      domain: params.domain,
      displayName: params.displayName ?? null,
      bio: params.bio ?? null,
      publicKey: keys.publicKeyPem,
      privateKey: keys.privateKeyPem,
      isLocal: true,
      inboxUrl: `${actorId}/inbox`,
      outboxUrl: `${actorId}/outbox`,
      followersUrl: `${actorId}/followers`,
      followingUrl: `${actorId}/following`,
    })
    .returning();
  const row = inserted[0];
  return {
    id: row.id,
    username: row.username,
    domain: row.domain,
    displayName: row.displayName,
    bio: row.bio,
    publicKeyPem: keys.publicKeyPem,
    privateKeyPem: keys.privateKeyPem,
  };
}
