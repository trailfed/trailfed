# ADR-0002: Runtime — Node.js 20 LTS

**Status:** Accepted
**Date:** 2026-04-22
**Deciders:** @kopaev

## Context

Fedify supports Node.js, Bun and Deno. We need a single supported runtime for dev, CI and production to keep operator onboarding simple.

## Decision

Target **Node.js 20 LTS** as the primary runtime. Bun is allowed for local experimentation but not a supported deployment target in Phase 0–2.

## Consequences

**Positive**
- 20 LTS is supported until April 2026 for security fixes, then 30 LTS (Oct 2026–Apr 2028) provides a well-known upgrade window.
- Widest compatibility for npm packages, tooling and Docker base images.
- Production stability: Node.js has been hardened at scale for years.

**Negative**
- Slower startup and less memory-efficient than Bun.
- We miss the single-binary UX Bun could provide.

**Neutral**
- When Node 30 LTS ships, we will evaluate and likely migrate with a follow-up ADR.

## Alternatives considered

- **Bun 1.x** — rejected for Phase 0: still maturing, occasional Fedify compatibility gaps, smaller production track record. Reconsider in Phase 3.
- **Deno 2** — rejected: smaller ecosystem for production ops (monitoring, tracing), fewer operators familiar with it.

## References

- [Node.js release schedule](https://nodejs.org/en/about/previous-releases)
- [Fedify runtime support](https://fedify.dev/tutorial)
