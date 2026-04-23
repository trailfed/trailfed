// SPDX-License-Identifier: AGPL-3.0-or-later

import { randomUUID } from 'node:crypto';

import { sql } from 'drizzle-orm';
import type { Logger } from 'pino';

import type { DbClient } from '../db/client.js';

/**
 * Shape of a `Place` ActivityStreams object we understand. Intentionally
 * minimal — longitude/latitude straight off ActivityStreams 2.0, `category`
 * is a TrailFed extension (camp_site | fuel | sanitary_dump_station | …).
 */
export interface PlaceObject {
  type: 'Place';
  id?: string;
  name?: string;
  /** TrailFed extension — required for our routing. */
  category?: string;
  longitude?: number;
  latitude?: number;
  /** Optional free-form summary. */
  summary?: string;
}

export interface PersistPlaceParams {
  db: DbClient;
  place: PlaceObject;
  /** Actor URI of the poster (used as attribution + origin instance). */
  actorUri: string;
  /** For local places we have the DB id of the origin actor; for remote we don't. */
  originActorId?: bigint;
  isLocal: boolean;
  log?: Logger;
}

export interface PersistedPlace {
  id: bigint;
  uri: string;
  category: string;
  name: string;
  lon: number;
  lat: number;
}

/**
 * Insert a Place activity's object into `places` + `place_sources`.
 * Idempotent: `uri` is unique, second insert is skipped.
 * Returns `null` if the place object is malformed (missing coords / category).
 */
export async function persistPlaceFromActivity(
  params: PersistPlaceParams,
): Promise<PersistedPlace | null> {
  const p = params.place;
  if (
    typeof p.longitude !== 'number' ||
    typeof p.latitude !== 'number' ||
    typeof p.category !== 'string' ||
    p.category.length === 0
  ) {
    params.log?.warn({ place: p }, 'place: missing coordinates or category');
    return null;
  }
  const name = typeof p.name === 'string' && p.name.length > 0 ? p.name : 'Unnamed';
  const uri = p.id ?? `urn:uuid:${randomUUID()}`;
  const originInstance = safeHost(params.actorUri);
  const sourceType = params.isLocal ? 'user' : 'activitypub';
  const geom = `SRID=4326;POINT(${p.longitude} ${p.latitude})`;

  const inserted = (await params.db.execute(sql`
    INSERT INTO places
      (uri, category, names, geom, source_type, origin_instance, origin_actor_id, is_active)
    VALUES
      (${uri},
       ${p.category},
       ${JSON.stringify({ default: name })}::jsonb,
       ST_GeogFromText(${geom}),
       ${sourceType},
       ${originInstance},
       ${params.originActorId ?? null},
       true)
    ON CONFLICT (uri) DO NOTHING
    RETURNING id::text
  `)) as unknown as Array<{ id: string }>;

  if (inserted.length === 0) {
    // Already existed — fetch the existing row so callers still get a result.
    const existing = (await params.db.execute(sql`
      SELECT id::text FROM places WHERE uri = ${uri} LIMIT 1
    `)) as unknown as Array<{ id: string }>;
    if (existing.length === 0) return null;
    return {
      id: BigInt(existing[0].id),
      uri,
      category: p.category,
      name,
      lon: p.longitude,
      lat: p.latitude,
    };
  }

  const placeId = BigInt(inserted[0].id);

  // Record provenance in place_sources (best-effort — schema requires jsonb).
  await params.db.execute(sql`
    INSERT INTO place_sources (place_id, source_type, source_uri, fields)
    VALUES (${placeId}, ${sourceType}, ${params.actorUri}, ${JSON.stringify(p)}::jsonb)
  `);

  return {
    id: placeId,
    uri,
    category: p.category,
    name,
    lon: p.longitude,
    lat: p.latitude,
  };
}

function safeHost(uri: string): string | null {
  try {
    return new URL(uri).host;
  } catch {
    return null;
  }
}

// Inbound Place persistence is now triggered by Fedify's Create inbox
// listener — see `federation/fedify.ts`. This file keeps only the pure
// persistence function, which is reused by both the inbox listener and the
// outbox publish path.
