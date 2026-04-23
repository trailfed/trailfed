// SPDX-License-Identifier: AGPL-3.0-or-later

import { randomUUID } from 'node:crypto';

import { and, eq, sql } from 'drizzle-orm';

import type { DbClient } from '../db/client.js';
import { ensureRemoteActor, findLocalActorByUsername } from '../db/actors.js';
import { actors, follows } from '../db/schema.js';

import type { ActivityHandler, InboundActivity } from './inbox.js';
import { deliverActivity, resolveInboxUrl } from './delivery.js';

/**
 * Build a `Follow` handler: persists the relationship and auto-replies with
 * an `Accept`. Factory takes its dependencies (DB + delivery) so tests can
 * swap them.
 */
export function makeFollowHandler(deps: {
  db: DbClient;
  deliver?: typeof deliverActivity;
  resolveInbox?: typeof resolveInboxUrl;
  publicOrigin: string;
}): ActivityHandler {
  const deliver = deps.deliver ?? deliverActivity;
  const resolveInbox = deps.resolveInbox ?? resolveInboxUrl;

  return async (activity: InboundActivity, ctx) => {
    const followerUri = typeof activity.actor === 'string' ? activity.actor : activity.actor?.id;
    const targetUri = typeof activity.object === 'string' ? activity.object : undefined;
    if (!followerUri || !targetUri) {
      ctx.log.warn({ activity }, 'Follow: missing actor or object');
      return;
    }

    // Our local target: parse the username off the URL and look it up.
    const targetUrl = new URL(targetUri);
    const expectedPrefix = `${deps.publicOrigin}/actors/`;
    if (!targetUri.startsWith(expectedPrefix)) {
      ctx.log.warn({ targetUri }, 'Follow: target is not a local actor URI');
      return;
    }
    const targetUsername = targetUrl.pathname.replace('/actors/', '').split('/')[0];
    const targetActor = await findLocalActorByUsername(
      deps.db,
      targetUsername,
      new URL(deps.publicOrigin).host,
    );
    if (!targetActor) {
      ctx.log.warn({ targetUsername }, 'Follow: no such local actor');
      return;
    }

    // Upsert the remote follower so we can FK into follows.
    const followerUrl = new URL(followerUri);
    const followerUsername = followerUrl.pathname.split('/').pop() ?? 'unknown';
    const follower = await ensureRemoteActor(deps.db, {
      uri: followerUri,
      username: followerUsername,
      domain: followerUrl.host,
    });

    // Idempotent insert — second Follow from the same actor is a no-op.
    await deps.db
      .insert(follows)
      .values({
        actorId: follower.id,
        targetActorId: targetActor.id,
        acceptedAt: new Date(),
      })
      .onConflictDoNothing();

    // Build Accept activity. `object` must echo the original Follow so the
    // follower can pair it with their outstanding request.
    const acceptId = `${deps.publicOrigin}/activities/${randomUUID()}`;
    const accept = {
      '@context': 'https://www.w3.org/ns/activitystreams',
      id: acceptId,
      type: 'Accept',
      actor: targetUri,
      object: activity,
    };

    // Find remote inbox — prefer what HTTP Signature verification already
    // cached, but fall back to an actor fetch.
    const cachedRows = await deps.db
      .select({ inbox: actors.inboxUrl })
      .from(actors)
      .where(eq(actors.uri, followerUri))
      .limit(1);
    let inboxUrl = cachedRows[0]?.inbox ?? null;
    if (!inboxUrl) {
      inboxUrl = await resolveInbox(followerUri);
      if (inboxUrl) {
        await deps.db
          .update(actors)
          .set({ inboxUrl, updatedAt: sql`now()` })
          .where(and(eq(actors.uri, followerUri), eq(actors.isLocal, false)));
      }
    }
    if (!inboxUrl) {
      ctx.log.warn({ followerUri }, 'Follow: cannot resolve follower inbox, skipping Accept');
      return;
    }

    const delivered = await deliver({
      inboxUrl,
      activity: accept,
      privateKeyPem: targetActor.privateKeyPem,
      keyId: `${targetUri}#main-key`,
      log: ctx.log,
    });
    ctx.log.info({ inboxUrl, delivered }, 'Follow: Accept delivery attempted');
  };
}
