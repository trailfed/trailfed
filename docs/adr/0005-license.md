# ADR-0005: License — AGPL-3.0-or-later

**Status:** Accepted
**Date:** 2026-04-22
**Deciders:** @kopaev

## Context

As an open, federated platform, TrailFed's value comes from a shared commons. We want to:

- encourage contributions from the ecosystem (Mastodon/GoToSocial/Pleroma are all xGPL-family)
- prevent closed-source SaaS forks that take without giving back
- remain compatible with our main dependencies (Fedify MIT, MapLibre BSD-3, SvelteKit MIT)

## Decision

License the project under **GNU Affero General Public License v3.0 or later (AGPL-3.0-or-later)**.

All source files carry an SPDX header:
```
// SPDX-License-Identifier: AGPL-3.0-or-later
```

Contributions are accepted under a **Developer Certificate of Origin (DCO)** sign-off — no CLA.

## Consequences

**Positive**
- AGPL is copyleft: anyone running a modified TrailFed over a network must publish their modifications. This protects the commons.
- Aligned with the fediverse norm (Mastodon, GoToSocial use AGPL; Pleroma uses AGPL + CC-BY-SA for docs).
- MIT/BSD upstream (Fedify, MapLibre) compatible with AGPL downstream.

**Negative**
- Some companies have AGPL-hostile policies and won't deploy TrailFed internally. This is a chosen trade-off: we prefer a healthy commons to corporate consumption.
- Mixing with proprietary plugins requires care; plugins that are "separate programs" (linked via network/IPC) are not derivative works.

**Neutral**
- "or-later" clause lets us adopt a future AGPL-4 (or bug-fix version) without re-licensing.

## Alternatives considered

- **MIT / Apache 2.0** — rejected: permissive licences invite SaaS forks that don't contribute back (the very thing Mastodon avoided by choosing AGPL).
- **Elastic License v2 / SSPL** — rejected: not OSI-approved, divisive in OSS communities, create friction for contributors.
- **GPL-3** (non-A) — rejected: doesn't cover network use, so a hosted SaaS provider could legally ship modifications without sharing them.

## References

- [AGPL-3.0 full text](https://www.gnu.org/licenses/agpl-3.0.html)
- [Developer Certificate of Origin](https://developercertificate.org/)
- [SPDX license identifiers](https://spdx.org/licenses/)
