// SPDX-License-Identifier: AGPL-3.0-or-later

import { and, desc, eq, sql } from 'drizzle-orm';

import type { DbClient } from '../db/client.js';
import { activities, peers } from '../db/schema.js';

/** Returns true if `domain` is on the instance block-list (peers.trust_level = 'blocklist'). */
export async function isDomainBlocked(db: DbClient, domain: string): Promise<boolean> {
  const rows = await db
    .select({ id: peers.id })
    .from(peers)
    .where(and(eq(peers.domain, domain), eq(peers.trustLevel, 'blocklist')))
    .limit(1);
  return rows.length > 0;
}

/**
 * Add a domain to the block-list. Idempotent: reuses the existing peers row
 * if present, otherwise inserts a fresh one.
 */
export async function addBlock(db: DbClient, domain: string): Promise<void> {
  await db.execute(sql`
    INSERT INTO peers (domain, trust_level)
    VALUES (${domain}, 'blocklist')
    ON CONFLICT (domain) DO UPDATE SET trust_level = 'blocklist'
  `);
}

export async function listBlocks(db: DbClient): Promise<string[]> {
  const rows = await db
    .select({ domain: peers.domain })
    .from(peers)
    .where(eq(peers.trustLevel, 'blocklist'));
  return rows.map((r) => r.domain);
}

// Flag inbound persistence moved to the Fedify Create/Flag inbox listener
// in `federation/fedify.ts`. This file keeps only the admin-facing helpers.

export async function listRecentFlags(db: DbClient, limit = 50) {
  return db
    .select({
      uri: activities.uri,
      data: activities.data,
      publishedAt: activities.publishedAt,
    })
    .from(activities)
    .where(eq(activities.type, 'Flag'))
    .orderBy(desc(activities.publishedAt))
    .limit(limit);
}
