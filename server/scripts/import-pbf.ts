// SPDX-License-Identifier: AGPL-3.0-or-later

// Phase 0 exit spike — OSM PBF importer PoC.
//
// Downloads a small regional PBF (Cyprus by default), filters elements that
// are interesting to overlanders/vanlife — campsites, fuel stations and RV
// sanitary dump stations — and inserts them into the `places` table.
//
// Re-running the script is idempotent: rows are upserted on (osm_id, osm_type)
// using the existing `places_osm_id_idx`.
//
// OSM tag mapping (verified against https://wiki.openstreetmap.org/wiki/):
//   tourism=camp_site         → category 'camp_site'
//   amenity=fuel              → category 'fuel'
//   amenity=sanitary_dump_station → category 'dump_station'
//
// We use `amenity=sanitary_dump_station` (not `amenity=waste_disposal`, which
// is general garbage / hazardous waste) — this is the OSM canonical tag for an
// RV/caravan black-water dump station. See:
//   https://wiki.openstreetmap.org/wiki/Tag:amenity%3Dsanitary_dump_station

import { createWriteStream } from 'node:fs';
import { mkdir, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';

import { sql } from 'drizzle-orm';
import { createOSMStream } from 'osm-pbf-parser-node';
import { pino } from 'pino';

import { createDbClient } from '../src/db/client.js';
import { places } from '../src/db/schema.js';

const log = pino({ name: 'trailfed-import-pbf' });

const PBF_URL = process.env.PBF_URL ?? 'https://download.geofabrik.de/europe/cyprus-latest.osm.pbf';
const HERE = dirname(fileURLToPath(import.meta.url));
const CACHE_PATH = resolve(HERE, '..', '.cache', 'cyprus.pbf');
const MAX_INSERTS = Number(process.env.PBF_MAX_INSERTS ?? 20);

type OsmNode = {
  type: 'node';
  id: number;
  lat: number;
  lon: number;
  tags?: Record<string, string>;
};

type OsmWay = {
  type: 'way';
  id: number;
  refs: number[];
  tags?: Record<string, string>;
};

type OsmElement = OsmNode | OsmWay | { type: string };

function categoryFor(tags: Record<string, string> | undefined): string | null {
  if (!tags) return null;
  if (tags.tourism === 'camp_site') return 'camp_site';
  if (tags.amenity === 'fuel') return 'fuel';
  if (tags.amenity === 'sanitary_dump_station') return 'dump_station';
  return null;
}

async function ensurePbf(): Promise<string> {
  await mkdir(dirname(CACHE_PATH), { recursive: true });
  try {
    const s = await stat(CACHE_PATH);
    if (s.size > 0) {
      log.info({ path: CACHE_PATH, bytes: s.size }, 'using cached PBF');
      return CACHE_PATH;
    }
  } catch {
    // not cached
  }
  log.info({ url: PBF_URL, dest: CACHE_PATH }, 'downloading PBF');
  const res = await fetch(PBF_URL);
  if (!res.ok || !res.body) {
    throw new Error(`failed to download ${PBF_URL}: ${res.status} ${res.statusText}`);
  }
  await pipeline(res.body as unknown as NodeJS.ReadableStream, createWriteStream(CACHE_PATH));
  const s = await stat(CACHE_PATH);
  log.info({ path: CACHE_PATH, bytes: s.size }, 'PBF downloaded');
  return CACHE_PATH;
}

type Candidate = {
  osmType: 'node' | 'way';
  osmId: number;
  category: string;
  name: string;
  tags: Record<string, string>;
  // For ways, lon/lat is filled on the second pass via the centroid of refs.
  lon?: number;
  lat?: number;
  refs?: number[];
};

async function collectCandidates(file: string): Promise<Candidate[]> {
  const out: Candidate[] = [];
  // Single streaming pass: nodes are matched directly; way candidates store
  // their ref ids and we resolve their centroid in a second pass.
  const wayCandidates: Candidate[] = [];
  for await (const item of createOSMStream(file, { withTags: true })) {
    const el = item as OsmElement;
    if (el.type === 'node') {
      const node = el as OsmNode;
      const cat = categoryFor(node.tags);
      if (cat) {
        out.push({
          osmType: 'node',
          osmId: node.id,
          category: cat,
          name: node.tags?.name ?? 'Unnamed',
          tags: node.tags ?? {},
          lon: node.lon,
          lat: node.lat,
        });
      }
    } else if (el.type === 'way') {
      const way = el as OsmWay;
      const cat = categoryFor(way.tags);
      if (cat) {
        wayCandidates.push({
          osmType: 'way',
          osmId: way.id,
          category: cat,
          name: way.tags?.name ?? 'Unnamed',
          tags: way.tags ?? {},
          refs: way.refs,
        });
      }
    }
  }

  if (wayCandidates.length === 0) return out;

  // Build the set of node ids we need to compute way centroids.
  const needed = new Set<number>();
  for (const w of wayCandidates) for (const r of w.refs ?? []) needed.add(r);
  const coords = new Map<number, { lon: number; lat: number }>();
  for await (const item of createOSMStream(file, { withTags: false })) {
    const el = item as OsmElement;
    if (el.type === 'node') {
      const node = el as OsmNode;
      if (needed.has(node.id)) coords.set(node.id, { lon: node.lon, lat: node.lat });
    }
  }
  for (const w of wayCandidates) {
    let sumLon = 0;
    let sumLat = 0;
    let count = 0;
    for (const r of w.refs ?? []) {
      const c = coords.get(r);
      if (c) {
        sumLon += c.lon;
        sumLat += c.lat;
        count++;
      }
    }
    if (count > 0) {
      out.push({ ...w, lon: sumLon / count, lat: sumLat / count });
    }
  }
  return out;
}

async function main() {
  const file = await ensurePbf();
  log.info('parsing PBF — this may take a moment');
  const candidates = await collectCandidates(file);
  log.info({ found: candidates.length }, 'matching elements found');

  // Cap inserts so the PoC stays small and predictable.
  const subset = candidates.slice(0, MAX_INSERTS);

  const { db, sql: closer } = createDbClient();
  try {
    let inserted = 0;
    for (const c of subset) {
      if (c.lon === undefined || c.lat === undefined) continue;
      const uri = `https://www.openstreetmap.org/${c.osmType}/${c.osmId}`;
      const wkt = `SRID=4326;POINT(${c.lon} ${c.lat})`;
      await db
        .insert(places)
        .values({
          uri,
          category: c.category,
          names: { default: c.name },
          geom: wkt,
          osmId: BigInt(c.osmId),
          osmType: c.osmType,
          osmTags: c.tags,
          sourceType: 'osm',
          sourceLicense: 'ODbL-1.0',
          sourceConfidence: 80,
          attribution: '© OpenStreetMap contributors',
        })
        .onConflictDoNothing({ target: places.uri });
      inserted++;
    }
    log.info({ attempted: subset.length, inserted }, 'import complete');

    const result = await db.execute(
      sql`SELECT COUNT(*)::int AS n FROM places WHERE source_type = 'osm'`,
    );
    const n = (result as unknown as Array<{ n: number }>)[0]?.n ?? 0;
    log.info({ count: n }, 'places with source_type=osm');
  } finally {
    await closer.end({ timeout: 5 });
  }
}

main().catch((err) => {
  log.error({ err }, 'import failed');
  process.exit(1);
});
