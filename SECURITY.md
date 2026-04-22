# Security Policy

## Reporting a vulnerability

**Please do not file public GitHub issues for security problems.**

Send reports to **security@trailfed.org** (set up after Phase 0). Until that mailbox is live, use GitHub's private vulnerability reporting feature on this repository (Security tab → "Report a vulnerability").

Include, if possible:

- affected component(s) and version(s) (commit SHA, Docker tag)
- reproduction steps or proof-of-concept
- impact assessment (confidentiality / integrity / availability)
- suggested fix, if you have one

## Coordinated disclosure

We follow a **90-day coordinated disclosure** window.

1. We acknowledge receipt within **72 hours**.
2. We triage and confirm severity within **7 days**.
3. We work with you on a fix; you get credit in the advisory unless you prefer to stay anonymous.
4. We publish an advisory and patch release together, no later than 90 days after the initial report, unless we agree on an extension for exceptional cases.

Critical issues (remote code execution, authentication bypass, mass data exfiltration) are prioritised and may be patched faster with an out-of-band release.

## Scope

In scope:

- `trailfed/trailfed` monorepo (`server/`, `web/`, `infra/`).
- Official Docker images under `ghcr.io/trailfed/*`.
- Reference instances operated by TrailFed maintainers.

Out of scope:

- Third-party forks or modified deployments.
- Third-party dependencies (report upstream, but let us know too).
- Social engineering, physical attacks, denial-of-service testing against production instances.

## Hardening resources

- Default deployment config is documented in [docs/deployment.md](docs/deployment.md) (to be written in Phase 0).
- Privacy and data-retention posture: [docs/spec/privacy.md](docs/spec/privacy.md).
- Threat model (in progress): [docs/internal/threat-model.md](docs/internal/threat-model.md).

## Hall of fame

Security researchers who have helped improve TrailFed will be listed here after the first public release.
