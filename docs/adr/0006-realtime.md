# ADR-0006: Real-time — Centrifugo v6 (standalone)

**Status:** Accepted
**Date:** 2026-04-22
**Deciders:** @kopaev

## Context

Post-MVP features (opt-in live location for friends, real-time timeline updates, check-in notifications) need a WebSocket/SSE push layer. Embedding this in the Fedify server would couple long-lived connections to our request path and complicate scaling.

## Decision

Use **[Centrifugo v6](https://centrifugal.dev/)** as a standalone broker.

- Centrifugo subscribes authenticated clients to channels.
- The TrailFed server publishes JSON messages to channels via the HTTP API.
- Clients authenticate with short-lived JWTs issued by the TrailFed server.

## Consequences

**Positive**
- One binary (~50 MB RAM idle), trivial to deploy in Docker.
- Handles WebSocket, SSE and HTTP streaming uniformly.
- Scales horizontally with Redis/Nats presence and history backends (deferred until needed).
- Apache 2.0 licensed, healthy community.

**Negative**
- An extra service in the deployment graph; operators must run it.
- Introduces a second auth surface (JWT issuance) — must be kept tight.

**Neutral**
- Live location is **opt-in** and **deferred until post-v1.0**; in the MVP we use Centrifugo only for timeline pushes and moderation notifications.

## Alternatives considered

- **WebSockets directly from the Node.js server** — rejected: long-lived connections complicate deployment, scaling, and zero-downtime rollouts.
- **Server-Sent Events from the Node.js server** — acceptable for one-way pushes, but we'd still need a WS fallback for mobile and would end up reinventing Centrifugo.
- **Mercure hub** — smaller ecosystem, fewer ops references.

## References

- [Centrifugo docs](https://centrifugal.dev/docs/getting-started/introduction)
- [docs/spec/privacy.md](../spec/privacy.md) — live location privacy model
