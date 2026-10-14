// SPDX-License-Identifier: AGPL-3.0-or-later
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { resolveStatus, type Entry, type StatusResult } from './status.js';

interface Vector {
  name: string;
  description: string;
  now: string;
  entries: Entry[];
  expected: StatusResult;
}

const vectorsDir = fileURLToPath(new URL('../../../docs/spec/vectors/', import.meta.url));
const vectors: Vector[] = readdirSync(vectorsDir)
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) => JSON.parse(readFileSync(join(vectorsDir, f), 'utf8')) as Vector);

describe('status resolution test vectors', () => {
  it('has vectors to run', () => {
    expect(vectors.length).toBeGreaterThan(0);
  });

  for (const v of vectors) {
    it(`${v.name}: ${v.description}`, () => {
      expect(resolveStatus(v.entries, v.now)).toEqual(v.expected);
    });
  }
});
