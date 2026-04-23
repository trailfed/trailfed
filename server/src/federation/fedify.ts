// SPDX-License-Identifier: AGPL-3.0-or-later

// All federation wiring built on @fedify/fedify. We provide persistence
// callbacks (actor lookup, keypair export, inbox listeners that write to
// our schema) and let Fedify handle WebFinger, HTTP Signatures, NodeInfo,
// and signed activity delivery.

import { randomUUID } from 'node:crypto';

import {
  Accept,
  Create,
  type Federation,
  Flag,
  Follow,
  MemoryKvStore,
  type Object as APObject,
  Person,
  Place as APPlace,
  type Recipient,
  createFederation,
  isActor,
  parseSemVer,
} from '@fedify/fedify';
import { sql } from 'drizzle-orm';
import type { Logger } from 'pino';

import type { DbClient } from '../db/client.js';
import { ensureRemoteActor, findLocalActorByUsername } from '../db/actors.js';
import { activities, follows } from '../db/schema.js';
import { importActorKeys } from './keys.js';
import { persistPlaceFromActivity } from './place.js';

export interface FederationContext {
  db: DbClient;
  publicOrigin: string;
  log: Logger;
}

export function createAppFederation(publicOrigin?: string): Federation<FederationContext> {
  const fed = createFederation<FederationContext>({
    kv: new MemoryKvStore(),
    // Force canonical origin so URIs inside JSON-LD use https even when the
    // node process is behind an HTTP-only reverse proxy.
    origin: publicOrigin,
  });

  fed
    .setActorDispatcher('/actors/{identifier}', async (ctx, identifier) => {
      const host = new URL(ctx.data.publicOrigin).host;
      const actor = await findLocalActorByUsername(ctx.data.db, identifier, host);
      if (!actor) return null;
      const keyPairs = await ctx.getActorKeyPairs(identifier);
      return new Person({
        id: ctx.getActorUri(identifier),
        preferredUsername: identifier,
        name: actor.displayName ?? identifier,
        summary: actor.bio ?? undefined,
        inbox: ctx.getInboxUri(identifier),
        outbox: ctx.getOutboxUri(identifier),
        followers: ctx.getFollowersUri(identifier),
        following: ctx.getFollowingUri(identifier),
        publicKey: keyPairs[0]?.cryptographicKey,
        assertionMethods: keyPairs.map((kp) => kp.multikey),
      });
    })
    .setKeyPairsDispatcher(async (ctx, identifier) => {
      const host = new URL(ctx.data.publicOrigin).host;
      const actor = await findLocalActorByUsername(ctx.data.db, identifier, host);
      if (!actor) return [];
      try {
        return [await importActorKeys(actor)];
      } catch (err) {
        ctx.data.log.error({ err, identifier }, 'keyPairsDispatcher: import failed');
        return [];
      }
    });

  // Empty outbox / followers / following collections — required so the
  // actor dispatcher can mint their URIs. Populating is Phase 2 work.
  fed.setOutboxDispatcher('/actors/{identifier}/outbox', async () => ({ items: [] }));
  fed.setFollowersDispatcher('/actors/{identifier}/followers', async () => ({ items: [] }));
  fed.setFollowingDispatcher('/actors/{identifier}/following', async () => ({ items: [] }));

  fed
    .setInboxListeners('/actors/{identifier}/inbox', '/inbox')
    .on(Follow, async (ctx, follow) => {
      const followerUri = follow.actorId?.href;
      const targetUri = follow.objectId?.href;
      if (!followerUri || !targetUri) return;

      const targetUsername = tailSegment(targetUri);
      const host = new URL(ctx.data.publicOrigin).host;
      const target = await findLocalActorByUsername(ctx.data.db, targetUsername, host);
      if (!target) return;

      const followerUrl = new URL(followerUri);
      const follower = await ensureRemoteActor(ctx.data.db, {
        uri: followerUri,
        username: tailSegment(followerUri) || 'unknown',
        domain: followerUrl.host,
      });
      await ctx.data.db
        .insert(follows)
        .values({
          actorId: follower.id,
          targetActorId: target.id,
          acceptedAt: new Date(),
        })
        .onConflictDoNothing();

      const followerActor = await ctx.lookupObject(followerUri);
      if (!isActor(followerActor)) return;
      await ctx.sendActivity(
        { identifier: targetUsername },
        followerActor as unknown as Recipient,
        new Accept({
          id: new URL(`${ctx.data.publicOrigin}/activities/${randomUUID()}`),
          actor: ctx.getActorUri(targetUsername),
          object: follow,
        }),
      );
    })
    .on(Create, async (ctx, create) => {
      const object: APObject | null = await create.getObject();
      if (!(object instanceof APPlace)) {
        ctx.data.log.info('Create: non-Place, skipping');
        return;
      }
      const actorUri = create.actorId?.href;
      if (!actorUri) return;
      const lonLat = extractLonLat(object);
      if (!lonLat) return;

      await persistPlaceFromActivity({
        db: ctx.data.db,
        place: {
          type: 'Place',
          id: object.id?.href,
          name: object.name?.toString(),
          category: extractCategory(object) ?? 'unknown',
          longitude: lonLat.lon,
          latitude: lonLat.lat,
        },
        actorUri,
        isLocal: false,
        log: ctx.data.log,
      });
    })
    .on(Flag, async (ctx, flag) => {
      const actorUri = flag.actorId?.href;
      if (!actorUri) return;
      const uri = flag.id?.href ?? `urn:flag:${Date.now()}`;
      try {
        await ctx.data.db.insert(activities).values({
          uri,
          type: 'Flag',
          actorId: null,
          objectUri: flag.objectId?.href ?? null,
          data: (await flag.toJsonLd({ contextLoader: ctx.contextLoader })) as Record<
            string,
            unknown
          >,
          publishedAt: new Date(),
        });
        ctx.data.log.info({ uri, actorUri }, 'Flag recorded');
      } catch (err) {
        ctx.data.log.warn({ err, uri }, 'Flag insert failed');
      }
    });

  fed.setNodeInfoDispatcher('/nodeinfo/2.1', async (ctx) => {
    const host = new URL(ctx.data.publicOrigin).host;
    const counts = (await ctx.data.db.execute(sql`
      SELECT
        (SELECT COUNT(*) FROM actors WHERE is_local = true AND domain = ${host}) AS users,
        (SELECT COUNT(*) FROM notes) AS posts
    `)) as unknown as Array<{ users: string; posts: string }>;
    const users = Number(counts[0]?.users ?? 0);
    return {
      software: { name: 'trailfed', version: parseSemVer('0.0.1') },
      protocols: ['activitypub'],
      usage: {
        users: { total: users, activeMonth: users, activeHalfyear: users },
        localPosts: Number(counts[0]?.posts ?? 0),
        localComments: 0,
      },
      openRegistrations: false,
      services: { inbound: [], outbound: [] },
    };
  });

  return fed;
}

/**
 * Client-side outbox publish. Persists the activity to `activities`, then
 * asks Fedify to sign and deliver it to every addressee. Fedify owns the
 * signing — we don't touch HTTP Signatures here.
 */
export async function publishFromOutbox(params: {
  fed: Federation<FederationContext>;
  db: DbClient;
  publicOrigin: string;
  username: string;
  actorId: bigint;
  activityInput: Record<string, unknown>;
  log: Logger;
}): Promise<{ id: string }> {
  const ctx = params.fed.createContext(new URL(params.publicOrigin), {
    db: params.db,
    publicOrigin: params.publicOrigin,
    log: params.log,
  });

  const id = `${params.publicOrigin}/activities/${randomUUID()}`;
  const raw: Record<string, unknown> = {
    '@context': 'https://www.w3.org/ns/activitystreams',
    ...params.activityInput,
    id,
    actor: ctx.getActorUri(params.username).href,
    published: new Date().toISOString(),
  };

  // Create Place → also persist locally so our own map shows it instantly.
  if (
    raw.type === 'Create' &&
    raw.object &&
    typeof raw.object === 'object' &&
    (raw.object as { type?: string }).type === 'Place'
  ) {
    const obj = raw.object as Record<string, unknown>;
    if (!obj.id) obj.id = `${params.publicOrigin}/places/${randomUUID()}`;
    await persistPlaceFromActivity({
      db: params.db,
      place: {
        type: 'Place',
        id: obj.id as string,
        name: typeof obj.name === 'string' ? obj.name : undefined,
        category: (obj.category as string) ?? 'unknown',
        longitude: Number(obj.longitude),
        latitude: Number(obj.latitude),
      },
      actorUri: String(raw.actor),
      originActorId: params.actorId,
      isLocal: true,
      log: params.log,
    });
  }

  const type = typeof raw.type === 'string' ? raw.type : 'Activity';
  await params.db.insert(activities).values({
    uri: id,
    type,
    actorId: params.actorId,
    objectUri:
      typeof raw.object === 'string'
        ? raw.object
        : ((raw.object as { id?: string } | undefined)?.id ?? null),
    data: raw,
    publishedAt: new Date(),
  });

  // Deliver via Fedify. We parse the JSON-LD through the matching Fedify
  // class so HTTP Signatures + JSON-LD proofs are produced correctly.
  const activity =
    type === 'Create'
      ? await Create.fromJsonLd(raw, { contextLoader: ctx.contextLoader })
      : type === 'Follow'
        ? await Follow.fromJsonLd(raw, { contextLoader: ctx.contextLoader })
        : type === 'Flag'
          ? await Flag.fromJsonLd(raw, { contextLoader: ctx.contextLoader })
          : null;
  if (!activity) {
    params.log.warn({ type }, 'outbox: unsupported activity type, skipping delivery');
    return { id };
  }

  for (const recipientUri of collectRecipients(raw)) {
    try {
      const recipient = await ctx.lookupObject(recipientUri);
      if (!isActor(recipient)) {
        params.log.warn({ recipientUri }, 'outbox: recipient not an Actor');
        continue;
      }
      await ctx.sendActivity(
        { identifier: params.username },
        recipient as unknown as Recipient,
        activity,
      );
    } catch (err) {
      params.log.warn({ err, recipientUri }, 'outbox: delivery failed');
    }
  }
  return { id };
}

function tailSegment(uri: string): string {
  try {
    return new URL(uri).pathname.split('/').filter(Boolean).pop() ?? '';
  } catch {
    return '';
  }
}

function extractLonLat(place: APPlace): { lon: number; lat: number } | null {
  const lon = (place as unknown as { longitude?: number }).longitude;
  const lat = (place as unknown as { latitude?: number }).latitude;
  if (typeof lon === 'number' && typeof lat === 'number') return { lon, lat };
  return null;
}

function extractCategory(place: APPlace): string | null {
  const c = (place as unknown as { category?: string }).category;
  return typeof c === 'string' ? c : null;
}

function collectRecipients(activity: Record<string, unknown>): string[] {
  const out = new Set<string>();
  for (const field of ['to', 'cc'] as const) {
    const v = activity[field];
    if (typeof v === 'string' && v !== 'https://www.w3.org/ns/activitystreams#Public') out.add(v);
    else if (Array.isArray(v))
      for (const x of v)
        if (typeof x === 'string' && x !== 'https://www.w3.org/ns/activitystreams#Public')
          out.add(x);
  }
  return [...out];
}
