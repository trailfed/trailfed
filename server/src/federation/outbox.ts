// SPDX-License-Identifier: AGPL-3.0-or-later

import { randomUUID } from 'node:crypto';

import type { Logger } from 'pino';

import type { DbClient } from '../db/client.js';
import type { LocalActorRecord } from '../db/actors.js';
import { activities } from '../db/schema.js';

import { deliverActivity, resolveInboxUrl } from './delivery.js';

export interface OutboxPostResult {
  id: string;
  deliveries: Array<{ inboxUrl: string; ok: boolean }>;
}

/**
 * Persist a client-submitted activity to the `activities` table and fan out
 * signed deliveries to every addressee inbox.
 *
 * Scope is intentionally narrow for Phase 1: `to` and `cc` arrays of actor
 * URIs. We fetch each actor doc, read its `inbox`, and sign-and-send the
 * activity. Collection URIs (`followers`, `Public`) and shared-inbox
 * optimisation are out of scope — follow-up items in NEXT_STEPS.
 */
export async function publishFromOutbox(params: {
  db: DbClient;
  actor: LocalActorRecord;
  activityInput: Record<string, unknown>;
  publicOrigin: string;
  log: Logger;
  deliver?: typeof deliverActivity;
  resolveInbox?: typeof resolveInboxUrl;
}): Promise<OutboxPostResult> {
  const deliver = params.deliver ?? deliverActivity;
  const resolveInbox = params.resolveInbox ?? resolveInboxUrl;

  const id = `${params.publicOrigin}/activities/${randomUUID()}`;
  const publishedAt = new Date();
  const activity: Record<string, unknown> = {
    '@context': 'https://www.w3.org/ns/activitystreams',
    ...params.activityInput,
    id,
    actor: `${params.publicOrigin}/actors/${params.actor.username}`,
    published: publishedAt.toISOString(),
  };
  const type = typeof activity.type === 'string' ? activity.type : 'Activity';

  await params.db.insert(activities).values({
    uri: id,
    type,
    actorId: params.actor.id,
    objectUri:
      typeof activity.object === 'string'
        ? activity.object
        : ((activity.object as { id?: string })?.id ?? null),
    objectType:
      typeof activity.object === 'object' && activity.object !== null
        ? (((activity.object as { type?: string }).type as string | undefined) ?? null)
        : null,
    data: activity,
    publishedAt,
  });

  const recipients = collectRecipients(activity);
  const deliveries: Array<{ inboxUrl: string; ok: boolean }> = [];
  for (const recipientUri of recipients) {
    const inboxUrl = await resolveInbox(recipientUri);
    if (!inboxUrl) {
      params.log.warn({ recipientUri }, 'outbox: could not resolve recipient inbox');
      continue;
    }
    const ok = await deliver({
      inboxUrl,
      activity,
      privateKeyPem: params.actor.privateKeyPem,
      keyId: `${params.publicOrigin}/actors/${params.actor.username}#main-key`,
      log: params.log,
    });
    deliveries.push({ inboxUrl, ok });
  }
  return { id, deliveries };
}

function collectRecipients(activity: Record<string, unknown>): string[] {
  const out = new Set<string>();
  for (const field of ['to', 'cc'] as const) {
    const value = activity[field];
    if (typeof value === 'string' && value !== 'https://www.w3.org/ns/activitystreams#Public') {
      out.add(value);
    } else if (Array.isArray(value)) {
      for (const v of value) {
        if (typeof v === 'string' && v !== 'https://www.w3.org/ns/activitystreams#Public') {
          out.add(v);
        }
      }
    }
  }
  return [...out];
}
