// SPDX-License-Identifier: AGPL-3.0-or-later

// Applies all pending Drizzle migrations against DATABASE_URL and exits.
// Operators run this before first start; see server/README.md.

import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { pino } from 'pino';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const log = pino({ name: 'trailfed-migrate' });

export async function runMigrations(databaseUrl: string): Promise<void> {
  const sql = postgres(databaseUrl, { max: 1 });
  const db = drizzle(sql);
  const here = dirname(fileURLToPath(import.meta.url));
  const migrationsFolder = resolve(here, 'migrations');
  try {
    await migrate(db, { migrationsFolder });
    log.info({ migrationsFolder }, 'migrations applied');
  } finally {
    await sql.end({ timeout: 5 });
  }
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    log.error('DATABASE_URL is not set');
    process.exit(1);
  }
  runMigrations(url).catch((err) => {
    log.error({ err }, 'migration failed');
    process.exit(1);
  });
}
