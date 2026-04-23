// SPDX-License-Identifier: AGPL-3.0-or-later

import type { Logger } from 'pino';

/**
 * Inbound Activity envelope. We keep it loose — per AS2 anything with a
 * `type` is a valid Activity — and let the dispatcher narrow by type.
 */
export interface InboundActivity {
  readonly type?: string;
  readonly actor?: string | { id?: string };
  readonly object?: unknown;
  readonly [key: string]: unknown;
}

export interface DispatchContext {
  /** keyId of the verified signer (actor key URL, typically with `#main-key`). */
  readonly signerKeyId: string;
  readonly log: Logger;
}

export type ActivityHandler = (
  activity: InboundActivity,
  ctx: DispatchContext,
) => Promise<void> | void;

/**
 * Route an inbound, signature-verified activity to a handler registered by
 * type. Unknown types are logged and dropped (202 at the HTTP layer).
 */
export async function dispatchActivity(
  activity: InboundActivity,
  handlers: Record<string, ActivityHandler>,
  ctx: DispatchContext,
): Promise<'handled' | 'ignored'> {
  const type = typeof activity.type === 'string' ? activity.type : null;
  if (!type) {
    ctx.log.warn({ activity }, 'inbox: activity has no type');
    return 'ignored';
  }
  const handler = handlers[type];
  if (!handler) {
    ctx.log.info({ type }, 'inbox: no handler for activity type, dropping');
    return 'ignored';
  }
  await handler(activity, ctx);
  return 'handled';
}
