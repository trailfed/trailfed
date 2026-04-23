// SPDX-License-Identifier: AGPL-3.0-or-later

import type { Logger } from 'pino';

import { signOutgoingRequest } from './sign-request.js';

/**
 * Deliver a single activity to a single remote inbox URL, signed with the
 * local actor's private key. Returns `true` on 2xx, `false` otherwise so the
 * caller can decide whether to retry.
 */
export async function deliverActivity(params: {
  inboxUrl: string;
  activity: unknown;
  privateKeyPem: string;
  keyId: string;
  log?: Logger;
  /** Injectable for tests — defaults to global `fetch`. */
  fetchImpl?: typeof fetch;
  now?: () => Date;
}): Promise<boolean> {
  const body = Buffer.from(JSON.stringify(params.activity));
  const headers = signOutgoingRequest({
    method: 'POST',
    url: params.inboxUrl,
    body,
    privateKeyPem: params.privateKeyPem,
    keyId: params.keyId,
    now: params.now,
  });
  const doFetch = params.fetchImpl ?? fetch;
  try {
    const res = await doFetch(params.inboxUrl, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/activity+json',
        Accept: 'application/activity+json',
      },
      body,
    });
    if (!res.ok) {
      params.log?.warn(
        { inboxUrl: params.inboxUrl, status: res.status },
        'delivery failed (non-2xx)',
      );
      return false;
    }
    return true;
  } catch (err) {
    params.log?.warn({ inboxUrl: params.inboxUrl, err }, 'delivery threw');
    return false;
  }
}

/**
 * Resolve the inbox URL for a remote actor by fetching the actor JSON-LD.
 * Returns `null` on network / parse failure.
 */
export async function resolveInboxUrl(
  actorUri: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  try {
    const res = await fetchImpl(actorUri, {
      headers: { Accept: 'application/activity+json' },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { inbox?: string };
    return typeof body.inbox === 'string' ? body.inbox : null;
  } catch {
    return null;
  }
}
