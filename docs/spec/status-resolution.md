---
title: Status Resolution
version: 0.2
status: draft
updated: 2026-10-14
---

# Status Resolution v0.2 (normative)

This algorithm turns the observations of a place into the status every participant shows. It is
**normative**: an implementation conforms only if it produces exactly the expected output for every
file in [vectors/](vectors/).

Why it is part of the protocol: if each app decided for itself when a spot counts as "closed", the
same spot would look different on every site — the problem the protocol exists to solve.

## Inputs

- All accepted, non-retracted entries of one place group (see [core.md §6](core.md#6-identity-and-duplicates)).
- `now` — the evaluation time.

From them, build the list of **status observations**:

| Entry | Becomes |
|---|---|
| `place` | `access = open` (or its explicit `access` value) at `created_at` |
| `observation`, `kind: access` | its `value` at `observed_at` |
| `observation`, `kind: confirm` | `access = open` at `observed_at` |

Drop observations whose time is later than `now` + 5 minutes. Drop entries targeted by a
`retraction` from the same origin.

## Weights

| Observation | Points |
|---|---|
| has at least one `evidence` item (**strong**) | 4 |
| `contributor.on_site = true`, no evidence (**on-site**) | 2 |
| anything else (**remote**) | 1 |

Constants: threshold **T = 4** points, agreement window **W = 30 days**, freshness limit
**S = 365 days**.

A **contributor key** is `origin(entry.id) + " " + contributor.id`; for an entry without
`contributor` it is the entry `id`. Points are counted once per contributor key — the maximum of
that contributor's observations in the pending window.

So a status changes on: one strong report; or two independent on-site reports; or one on-site and
two remote; or four remote — all agreeing within 30 days.

## Algorithm

Sort status observations by time, then `recorded_at`, then `id` (ascending). Start with:

```
status = unknown, since = null, last_confirmed = null, pending = null
```

For each observation `o` with value `v`:

1. If `status = unknown`: set `status = v`, `since = last_confirmed = o.time`, `pending = null`.
2. Else if `v = status`: set `last_confirmed = o.time`, `pending = null`
   (someone saw the current status — open reports against it are dropped).
3. Else:
   - If `pending` exists, `pending.value = v` and `o.time − pending.since ≤ W`: add `o` to pending
     (per-contributor maximum).
   - Otherwise start a new `pending = { value: v, since: o.time, points: {key(o): weight(o)} }`.
   - If the sum of pending points ≥ T: `status = pending.value`, `since = pending.since`,
     `last_confirmed = o.time`, `pending = null`.

## Output

```json
{
  "status": "open | closed | restricted | seasonal_closed | unknown",
  "since": "time the current status began (first agreeing report)",
  "last_confirmed": "time of the latest observation that agreed with the status",
  "stale": false,
  "pending": { "value": "closed", "points": 2, "contributors": 1, "since": "..." }
}
```

- `stale = true` when `now − last_confirmed > S`.
- `pending` is `null` when there is none, or when `now − pending.since > W` (reports that never
  gathered support expire).

## How to display (recommended)

| Output | Display |
|---|---|
| `closed` | "Closed since 14 Oct — reported via Example App" |
| `open` + `pending.value = closed` | "Open · 1 report of closure on 14 Oct, not confirmed" |
| `stale = true` | "Not confirmed for over a year" |
| `unknown` | nothing special |

Show the attribution of the observations that decided the status.

## Test vectors

Each file in [vectors/](vectors/) is:

```json
{
  "name": "two-independent-reports-close",
  "description": "...",
  "now": "2026-03-06T00:00:00Z",
  "entries": [ "...entries of one place..." ],
  "expected": { "status": "closed", "since": "...", "last_confirmed": "...", "stale": false, "pending": null }
}
```

Timestamps in `expected` are copied verbatim from the input entries. The reference implementation
and its test runner: [`server/src/protocol/status.ts`](../../server/src/protocol/status.ts),
[`status.test.ts`](../../server/src/protocol/status.test.ts).

## Known limits (v0.2)

- One person with accounts in two apps counts as two contributors. Per-place pseudonyms make this
  impossible to detect by design; the threshold of two on-site reports keeps the damage small.
- A participant that fabricates "independent" contributors can flip statuses on its own. The answer
  is trust (`review` / `blocked`, [core.md §8](core.md#8-trust)), not the algorithm.
- Constants T, W, S are a first guess and will be tuned on pilot data; changing them is a minor
  version change with new vectors.
