// SPDX-License-Identifier: AGPL-3.0-or-later

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema.js';

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set');
  }
  return url;
}

export function createDbClient(
  databaseUrl: string = requireDatabaseUrl(),
  options?: {
    max?: number;
  },
) {
  const sql = postgres(databaseUrl, { max: options?.max ?? 10 });
  const db = drizzle(sql, { schema });
  return { db, sql };
}

export type DbClient = ReturnType<typeof createDbClient>['db'];
