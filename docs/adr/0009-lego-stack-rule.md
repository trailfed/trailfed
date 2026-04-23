# ADR 0009 — Lego-stack rule: off-the-shelf libraries only

**Status:** Accepted (2026-04-23)

## Context

Phase 1 of TrailFed was built by hand: custom HTTP Signatures verifier/signer,
inbox dispatcher, Follow/Accept handler, outbox delivery, WebFinger responder,
and NodeInfo dispatcher — despite [@fedify/fedify](https://fedify.dev) being a
project dependency since Phase 0 (see [ADR 0001](0001-backend-stack.md)).

The user intent is explicit: TrailFed should be a **lego-style assembly of
best-in-class, actively-maintained libraries**, so that:

- Security patches flow via Dependabot, not manual audits of self-written code.
- Protocol/crypto behaviour matches the fediverse de-facto standard.
- A future plug-in marketplace (WordPress/Laravel-style) is viable because the
  core stays thin and composable.

## Decision

1. **No hand-rolled crypto, protocol, or auth code.** Anything touching HTTP
   Signatures, ActivityPub dispatch, JSON-LD context loading, JWT, argon2,
   OAuth, or session management must live in a maintained npm package.
2. **Federation layer = Fedify.** `@fedify/fedify` + `@fedify/hono` handle
   WebFinger, Actor dispatch, HTTP Signatures (cavage-12 + RFC 9421 + Linked
   Data Signatures), NodeInfo, signed activity delivery.
3. **Custom code is bounded to:**
   - Persistence (Drizzle queries, schema).
   - Business rules (place category extraction, block-list semantics, place
     source provenance, argon2 password validation rules).
   - Thin HTTP routes that delegate to the above.
4. **Exceptions require an ADR.** A module may be written by hand only if no
   library exists, or existing ones are abandoned (>18 months without commits),
   or licence/size/lock-in is incompatible. The ADR must document this.

## Consequences

- Phase 1's `federation/http-signature.ts`, `sign-request.ts`, `delivery.ts`,
  `inbox.ts`, `outbox.ts`, `follow.ts`, `place.ts::makeCreateHandler`, and
  `moderation.ts::makeFlagHandler` were deleted; ~1,100 lines removed.
- Node 22 baseline (Fedify requirement).
- Actor keys migrated from PEM (`node:crypto`) to RSASSA-PKCS1-v1_5 JWK
  (`generateCryptoKeyPair` + `exportJwk`) so Fedify's importers handle them
  natively. Migration `0002` adds `public_key_jwk` / `private_key_jwk`
  columns; legacy PEM columns kept to avoid data loss on upgrade.
- Future Phase 2 features (notes, check-ins, live locations) will be added as
  Fedify inbox listeners + persistence callbacks, not new bespoke handlers.

## Tracked in memory

See `~/.claude/projects/-home-vanlife-trailfed/memory/feedback_lego_stack.md`
for the operating rule the assistant follows when new features come up.
