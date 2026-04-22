# TrailFed Governance

This document describes how decisions are made in the TrailFed project.

## Model

TrailFed starts under a **BDFL (Benevolent Dictator For Life)** model and transitions to a **Maintainer Council** once the project has three or more active maintainers. This is the same path Mastodon, Pixelfed and GoToSocial took — it works well for early-stage federated projects.

### Phase A — BDFL (now)

**Project lead:** Aleksey Kopaev ([@kopaev](https://github.com/kopaev)).

The project lead has final say on:

- accepting or declining pull requests
- naming and branding
- architectural direction and ADR approvals
- adding or removing maintainers
- financial decisions (grants, sponsorships, domain/hosting spend)

In practice, the lead aims to reach rough consensus with contributors on substantive changes; the BDFL lever exists to break ties, not to steer day-to-day work.

### Phase B — Maintainer Council (triggered at ≥3 maintainers)

Once three contributors hold the `maintainer` role, the Council replaces the BDFL for routine decisions:

- **Majority vote** (simple majority of active maintainers) on: PRs, ADRs, release timing, roadmap changes.
- **Supermajority** (2/3) on: adding/removing maintainers, license changes, code of conduct updates, changing governance itself.
- **BDFL veto** is preserved only for legal/safety-critical matters during Phase B; it expires once the project receives external legal entity status (e.g. joins a foundation — see Phase C).

### Phase C — Foundation (future, not committed)

Once the project has a stable contributor base and funding, it may be donated to a neutral foundation (NLnet, Open Collective, independent Software Freedom Conservancy-style home). This is explicitly deferred until after v1.0 and is subject to maintainer vote.

## Roles

### Contributor

Anyone who opens an issue or PR. No special permissions; all PRs subject to review.

### Maintainer

Granted by the project lead (Phase A) or supermajority of existing maintainers (Phase B). Maintainers have:

- commit access to the main repository
- the ability to review and merge PRs
- a vote in Council decisions (Phase B)

Criteria for maintainer status:

- sustained contribution over **at least 3 months** (code, review, documentation, community)
- alignment with the project's vision and code of conduct
- willingness to commit time to reviews and community support

### Emeritus maintainer

A former maintainer who stepped down voluntarily. Retains their name in the contributor list and advisory role but not commit access or vote. A returning emeritus must be re-nominated via the normal process.

## Decision process

For day-to-day decisions (issue triage, small PRs, doc updates) no formal vote is required — maintainer rough consensus is enough.

For significant decisions:

1. An issue or [ADR](docs/adr/) is opened describing the proposal.
2. At least **7 calendar days** for community comment (extendable if maintainers request).
3. Maintainers vote via PR approval or Council voting channel.
4. Outcome is recorded (merged PR + updated ADR or governance log).

**Silence is not consent.** If a proposal receives no maintainer reviews in 14 days, it is considered stalled and requires explicit re-surfacing.

## Code of Conduct enforcement

CoC enforcement is handled by a **Conduct Committee** — initially equal to the project lead, expanded to a 3-person rotating committee when the Council activates. Reports go to `conduct@trailfed.org`.

Sanctions follow the ladder in [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md): correction → warning → temporary ban → permanent ban.

## Funding

Financial decisions (grants, sponsorships, infrastructure spend) are Phase B Council matters. During Phase A, the project lead decides but commits to transparency:

- all incoming funds disclosed publicly (monthly summary in `docs/internal/funding-log.md`)
- infrastructure costs (domains, servers, services) itemised
- no payments to individuals for project work without Council approval once Phase B activates

## Conflict resolution

If the Council is deadlocked or the BDFL's decision is contested:

1. Open a public discussion for community input.
2. If unresolved, the Council may invite an external mediator (e.g. from a peer fediverse project).
3. As a last resort, the disputed change is deferred until the next release cycle.

## Changing this document

Governance changes require a Phase B supermajority (2/3 of maintainers) or, during Phase A, a public proposal with 14-day comment window and project lead approval.
