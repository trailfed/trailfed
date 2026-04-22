// SPDX-License-Identifier: AGPL-3.0-or-later

// drizzle-kit generate wraps customType dataType strings in double quotes,
// which turns `geography(Point, 4326)` into an identifier lookup rather than
// a type reference. Strip the quotes for PostGIS types so the DDL is valid.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, '..', 'src', 'db', 'migrations');

const files = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql'));
for (const f of files) {
  const p = join(migrationsDir, f);
  const before = readFileSync(p, 'utf8');
  const after = before.replace(/"geography\(Point, 4326\)"/g, 'geography(Point, 4326)');
  if (before !== after) {
    writeFileSync(p, after);
    console.log(`fixed PostGIS types in ${f}`);
  }
}
