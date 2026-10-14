// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Reference implementation of TrailFed status resolution v0.2.
// Normative description: docs/spec/status-resolution.md

export type AccessValue = 'open' | 'closed' | 'restricted' | 'seasonal_closed';
export type Status = AccessValue | 'unknown';

export interface Contributor {
  id: string;
  on_site?: boolean;
}

export interface Entry {
  id: string;
  type: 'place' | 'observation' | 'link' | 'retraction';
  recorded_at: string;
  created_at?: string;
  observed_at?: string;
  access?: AccessValue;
  kind?: string;
  value?: unknown;
  contributor?: Contributor;
  evidence?: unknown[];
  target?: string;
  retracted?: boolean;
}

export interface Pending {
  value: AccessValue;
  points: number;
  contributors: number;
  since: string;
}

export interface StatusResult {
  status: Status;
  since: string | null;
  last_confirmed: string | null;
  stale: boolean;
  pending: Pending | null;
}

const DAY_MS = 86_400_000;
export const THRESHOLD = 4;
export const WINDOW_MS = 30 * DAY_MS;
export const STALE_MS = 365 * DAY_MS;
const CLOCK_SKEW_MS = 5 * 60_000;
const ACCESS_VALUES: readonly string[] = ['open', 'closed', 'restricted', 'seasonal_closed'];

interface StatusObservation {
  value: AccessValue;
  time: string;
  ms: number;
  recordedAt: string;
  id: string;
  key: string;
  weight: number;
}

function origin(uri: string): string {
  return new URL(uri).origin;
}

function weight(entry: Entry): number {
  if (entry.evidence && entry.evidence.length > 0) {
    return 4;
  }
  return entry.contributor?.on_site === true ? 2 : 1;
}

function contributorKey(entry: Entry): string {
  return entry.contributor ? `${origin(entry.id)} ${entry.contributor.id}` : entry.id;
}

function toStatusObservation(entry: Entry): StatusObservation | null {
  let value: unknown;
  let time: string | undefined;

  if (entry.type === 'place') {
    value = entry.access ?? 'open';
    time = entry.created_at;
  } else if (entry.type === 'observation' && entry.kind === 'access') {
    value = entry.value;
    time = entry.observed_at;
  } else if (entry.type === 'observation' && entry.kind === 'confirm') {
    value = 'open';
    time = entry.observed_at;
  } else {
    return null;
  }

  if (time === undefined || typeof value !== 'string' || !ACCESS_VALUES.includes(value)) {
    return null;
  }

  return {
    value: value as AccessValue,
    time,
    ms: Date.parse(time),
    recordedAt: entry.recorded_at,
    id: entry.id,
    key: contributorKey(entry),
    weight: weight(entry),
  };
}

function compare(a: StatusObservation, b: StatusObservation): number {
  return (
    a.ms - b.ms ||
    Date.parse(a.recordedAt) - Date.parse(b.recordedAt) ||
    (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  );
}

/**
 * Derive the status of one place group from its entries at time `now`.
 * Entries of other places must be filtered out by the caller.
 */
export function resolveStatus(entries: Entry[], now: string): StatusResult {
  const nowMs = Date.parse(now);

  const retracted = new Set(
    entries
      .filter((e) => e.type === 'retraction' && e.target && origin(e.target) === origin(e.id))
      .map((e) => e.target as string),
  );

  const observations = entries
    .filter((e) => !e.retracted && !retracted.has(e.id))
    .map(toStatusObservation)
    .filter((o): o is StatusObservation => o !== null && o.ms <= nowMs + CLOCK_SKEW_MS)
    .sort(compare);

  let status: Status = 'unknown';
  let since: string | null = null;
  let lastConfirmed: string | null = null;
  let pending: {
    value: AccessValue;
    since: string;
    sinceMs: number;
    points: Map<string, number>;
  } | null = null;

  for (const o of observations) {
    if (status === 'unknown') {
      status = o.value;
      since = o.time;
      lastConfirmed = o.time;
      pending = null;
      continue;
    }

    if (o.value === status) {
      lastConfirmed = o.time;
      pending = null;
      continue;
    }

    if (pending && pending.value === o.value && o.ms - pending.sinceMs <= WINDOW_MS) {
      pending.points.set(o.key, Math.max(pending.points.get(o.key) ?? 0, o.weight));
    } else {
      pending = {
        value: o.value,
        since: o.time,
        sinceMs: o.ms,
        points: new Map([[o.key, o.weight]]),
      };
    }

    const total = [...pending.points.values()].reduce((sum, p) => sum + p, 0);
    if (total >= THRESHOLD) {
      status = pending.value;
      since = pending.since;
      lastConfirmed = o.time;
      pending = null;
    }
  }

  const livePending = pending && nowMs - pending.sinceMs <= WINDOW_MS ? pending : null;

  return {
    status,
    since,
    last_confirmed: lastConfirmed,
    stale: lastConfirmed !== null && nowMs - Date.parse(lastConfirmed) > STALE_MS,
    pending: livePending
      ? {
          value: livePending.value,
          points: [...livePending.points.values()].reduce((sum, p) => sum + p, 0),
          contributors: livePending.points.size,
          since: livePending.since,
        }
      : null,
  };
}
