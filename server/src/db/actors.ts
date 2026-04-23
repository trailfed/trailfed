// SPDX-License-Identifier: AGPL-3.0-or-later

import { and, eq } from 'drizzle-orm';

import { generateActorKeys, type Jwk } from '../federation/keys.js';

import type { DbClient } from './client.js';
import { actors } from './schema.js';

/**
 * A local actor row narrowed to what federation cares about. Keys are JWK
 * JSON (generated/imported by Fedify primitives); there's no custom crypto
 * here.
 */
export interface LocalActorRecord {
  id: bigint;
  username: string;
  domain: string;
  displayName: string | null;
  bio: string | null;
  publicKeyJwk: Jwk;
  privateKeyJwk: Jwk;
}

/**
 * Insert-or-fetch a remote actor by its ActivityPub URI. Used when we
 * receive a Follow from a host we haven't seen before.
 */
export async function ensureRemoteActor(
  db: DbClient,
  params: { uri: string; username: string; domain: string; inboxUrl?: string },
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
  if (!row || !row.publicKeyJwk || !row.privateKeyJwk) return null;
  return {
    id: row.id,
    username: row.username,
    domain: row.domain,
    displayName: row.displayName,
    bio: row.bio,
    publicKeyJwk: row.publicKeyJwk as Jwk,
    privateKeyJwk: row.privateKeyJwk as Jwk,
  };
}

/**
 * Ensure a local actor exists. If missing, Fedify mints a fresh RSA keypair
 * (JWK) and we persist it. Idempotent — safe to call on every boot.
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

  const keys = await generateActorKeys();
  const actorId = `${params.publicOrigin}/actors/${params.username}`;

  // Upsert: backfill JWK for legacy rows that were seeded with PEM-only keys.
  const inserted = await db
    .insert(actors)
    .values({
      uri: actorId,
      username: params.username,
      domain: params.domain,
      displayName: params.displayName ?? null,
      bio: params.bio ?? null,
      publicKeyJwk: keys.publicKeyJwk,
      privateKeyJwk: keys.privateKeyJwk,
      isLocal: true,
      inboxUrl: `${actorId}/inbox`,
      outboxUrl: `${actorId}/outbox`,
      followersUrl: `${actorId}/followers`,
      followingUrl: `${actorId}/following`,
    })
    .onConflictDoUpdate({
      target: actors.uri,
      set: {
        publicKeyJwk: keys.publicKeyJwk,
        privateKeyJwk: keys.privateKeyJwk,
      },
    })
    .returning();
  const row = inserted[0];
  return {
    id: row.id,
    username: row.username,
    domain: row.domain,
    displayName: row.displayName,
    bio: row.bio,
    publicKeyJwk: keys.publicKeyJwk,
    privateKeyJwk: keys.privateKeyJwk,
  };
}
