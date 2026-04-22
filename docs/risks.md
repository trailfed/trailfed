---
title: Risks and mitigations
version: 0.1
status: draft
updated: 2026-04-22
---

# 11. Risks and mitigations

An honest list of what can go wrong and what we are doing to reduce the risk.

## R1: Stalking / preying via live location

**Severity:** 🔴 Critical — can lead to physical harm.

**Description:** an attacker (ex-partner, stalker, abuser) uses live location to determine the victim's physical whereabouts.

**Mitigation:**
- Opt-in, OFF by default (see 08_PRIVACY_MODEL.md)
- 3 precision tiers (EXACT/CITY/COUNTRY)
- Stealth mode kill-switch
- Ghost delay (30 min default)
- Fuzz radius (±500m)
- Separate ACL for "who can see live location" (distinct from followers)
- No public geohash / nearby channels in MVP
- Live location deferred beyond v1.0 until safety review
- Instance-level restrictions (admins can globally disable the EXACT tier)
- Panic mode for survivors

**Residual risk:** some. Not zero — no technical mitigation fully solves the abuse problem. Education + admin policies are critical.

## R2: Scope creep — trying to build everything at once

**Severity:** 🟠 High — can kill the project before v1.0.

**Description:** adding "that would be cool too" features stretches the roadmap and scatters focus.

**Mitigation:**
- 7 clearly defined phases with scoping boundaries
- Phases 1–3 are self-sufficient (MVP = federation foundation + Places + map-first UI)
- Live location explicitly out of v1.0 scope unless a safety review approves it
- Quarterly review: what did we add vs. the plan?
- Formal RFC process for major features
- Maintainer authority to reject out-of-scope contributions (no hurt feelings)

**Residual risk:** medium. Community pressure is a constant vector.

## R3: Moderation hell (as in Mastodon)

**Severity:** 🟠 High — can drive away both users and admins.

**Description:** instance admins burn out under the moderation workload. Cross-instance harassment. Toxic behavior.

**Mitigation:**
- Each instance moderates itself (distributed load)
- Defederation tools built-in
- Reputation scoring per peer
- Clear Code of Conduct templates for admins
- Community support channels for admins
- Trust levels per peer (auto-graylist new peers)

**Residual risk:** medium. Social problems are not solved by technical means alone.

## R4: Spam instances

**Severity:** 🟡 Medium.

**Description:** an attacker stands up an instance and floods the network with fake POIs, check-ins, and accounts.

**Mitigation:**
- Graylist new peers by default (moderation queue)
- Rate limits on federated activities per peer
- Reputation scoring
- Community blocklist sharing (like Mastodon's shared blocklists)
- Geospatial fingerprinting to detect duplicate POIs

**Residual risk:** low–medium. Well-established defense patterns.

## R5: Duplicate POIs across federation

**Severity:** 🟡 Medium — UX problem.

**Description:** two instances independently create a POI for the same location. Users see duplicates on the map.

**Mitigation:**
- Geospatial fingerprint (sha256 of rounded lat/lng + category)
- Merge activities for proposed merges
- UI: "show similar POIs" on create
- Admin tools for bulk merge
- `trailfed:canonical_uri` for linking aliases

**Residual risk:** low. Ugly but not breaking.

## R6: ActivityPub implementation complexity

**Severity:** 🟡 Medium — a barrier to adoption.

**Description:** HTTP Signatures, JSON-LD, WebFinger, inbox processing — all of these are tricky. Implementation bugs break federation. An additional risk: go-fed is mature but low-activity, while Fedify is active but TypeScript/Node, which changes backend assumptions.

**Mitigation:**
- Phase 0 spike: Go/go-fed vs TypeScript/Fedify before committing
- Federation test suite (automated)
- Compatibility testing with Mastodon, Pleroma, GoToSocial
- Public interop fixtures and local test peers
- Docs for instance admins on common issues

**Residual risk:** medium. Proven libraries help, but Fediverse interop remains implementation-specific.

## R7: Google/Apple background geolocation restrictions

**Severity:** 🟠 High — fundamental constraint.

**Description:** modern mobile browsers (Safari, Chrome) restrict background geolocation heavily. Recording travel tracks in a PWA can be unreliable.

**Mitigation:**
- Explicit warning: "for full tracking, use the native app (Phase 6)"
- PWA works for foreground use (open the app → track actively)
- Background limitations documented directly in the UI
- Phase 6: native apps (iOS/Android) with proper background location permissions

**Residual risk:** medium. An inherent OS constraint, only solvable with native.

## R8: GDPR / legal violations

**Severity:** 🔴 Critical — can result in fines and legal action.

**Description:** violation of GDPR (EU), CCPA (California), or other privacy laws. Potential €20M fines.

**Mitigation:**
- Privacy-by-design model (see 08_PRIVACY_MODEL.md)
- Legal counsel reviews the privacy policy (budgeted in the grant)
- Transparent data handling
- Right-to-delete implemented
- Data Processing Agreement (DPA) templates for admins
- Jurisdictional awareness (instance admins are responsible in their jurisdiction)

**Residual risk:** medium. Each jurisdiction has its own laws. We cannot guarantee 100% compliance for every admin.

## R9: OSM community backlash

**Severity:** 🟡 Medium — reputation risk.

**Description:** the OSM community may perceive us as leeching (consuming OSM without contributing). Negative diary posts, social media criticism.

**Mitigation:**
- Additive philosophy clearly communicated
- Regular contributions via user OAuth (Phase 4+)
- Reporting data quality issues back to OSM
- Attending State of the Map conferences
- Public blog posts about our OSM usage and contributions
- iOverlander precedent (they cohabit successfully)

**Residual risk:** low. Transparent behavior + communication address most concerns.

## R10: GoToSocial / Bonfire / Fedify ecosystem does the same thing faster

**Severity:** 🟡 Medium — competition.

**Description:** GoToSocial adds geo features. Bonfire finalizes a geosocial extension. Fedify examples evolve into a geosocial server. TrailFed becomes less differentiated.

**Mitigation:**
- Travel/overland focus, differentiated from general-purpose platforms
- Cross-federation with all of them (they become peers, not competitors)
- Unique features: travel POI federation + map-first UX + OSM/import/moderation tooling
- Community relationships — the Fediverse is not winner-takes-all
- Possible future merger if tactics align

**Residual risk:** low. The Fediverse is not zero-sum.

## R11: Solo-maintainer burnout

**Severity:** 🟠 High — can lead to abandonment.

**Description:** the lead maintainer (especially in solo mode) burns out; the project slows down or dies.

**Mitigation:**
- Part-time start, not full-time immediately
- Active contributor recruitment from Phase 1
- Clear communication — "I can't respond to every issue"
- Designated second maintainer before Phase 3
- Documentation ensures the project continues even if the primary leaves
- Funding for sustainability (not just survival)

**Residual risk:** medium. A common OSS problem that requires ongoing management.

## R12: Data quality issues (misleading POIs)

**Severity:** 🟡 Medium — can cause real-world problems.

**Description:** a user posts a POI at a dangerous or wrong location. Another user arrives and gets into trouble.

**Mitigation:**
- Quality tiers (0–3) clearly displayed
- `tier 0 = unverified` badge always visible
- Reporting / flagging mechanism
- Time-based decay: POIs not visited in 18+ months flagged as `needs_verification`
- Community moderation: multiple independent verifications boost the tier
- Terms of Use disclaimer

**Residual risk:** medium. Physical-world hazards are beyond our control.

## R13: Legal liability for instance admins

**Severity:** 🟠 High — admins may face legal action.

**Description:** a user posts illegal content (stalking, defamation, illegal POI). The admin may be liable in some jurisdictions.

**Mitigation:**
- Clear Terms of Use templates
- Documented notice-and-takedown procedures
- Admin can defederate abusive peers
- Legal counsel consultation in the grant budget
- Jurisdictional advice in docs ("this is not legal advice, consult a local lawyer")

**Residual risk:** medium. Heavily dependent on jurisdiction.

## R14: Protocol fragmentation

**Severity:** 🟡 Medium — ecosystem risk.

**Description:** another project publishes an incompatible "federated travel standard". The ecosystem splits.

**Mitigation:**
- First-mover advantage — publish the spec early
- Reuse W3C ActivityPub — we do not invent our own
- Minimal extensions — easy compatibility
- Active in the swicg/geosocial W3C group
- Cross-federate with any compatible projects

**Residual risk:** low. Precedent: ActivityPub has already unified the social fediverse.

## R15: Server compromise → user data leak

**Severity:** 🔴 Critical — privacy breach.

**Description:** an instance server is hacked; user data (including sensitive location history) leaks.

**Mitigation:**
- Encryption at rest (configurable)
- Minimal data retention (default 30 days for location)
- Security audit pre-v1.0
- Bug bounty program
- Incident response plan documented
- Users opted in to high-precision data see clear warnings

**Residual risk:** medium. Every online service carries this risk. We mitigate through minimal data + audits.

## R16: ODbL / license contamination

**Severity:** 🟠 High — can block adoption and trigger legal conflict.

**Description:** OSM-derived data, user reviews, partner datasets, and data from remote instances get mixed together in a way that makes it impossible to determine license / attribution / share-alike obligations.

**Mitigation:**
- `place_sources` / field-level provenance
- Clear export licenses
- OSM-derived fields marked ODbL
- Reviews/check-ins licensed separately
- Legal review before public data exports

**Residual risk:** medium. ODbL nuances are complex and require review.

## R17: Overpass misuse / OSM infra abuse

**Severity:** 🟡 Medium — reputation + reliability risk.

**Description:** an initial import via the public Overpass API creates load, breaks on rate limits, and draws negative attention from the OSM community.

**Mitigation:**
- Bulk imports only via PBF extracts
- Overpass used only for small bbox/dev queries
- Respect fair-use and 429 responses
- Document how to self-host the importer

**Residual risk:** low if the pipeline is followed.

## Risk matrix

| Risk | Severity | Likelihood | Net Priority |
|---|---|---|---|
| R1 Stalking | Critical | Medium | 🔴🔴🔴 |
| R8 GDPR violations | Critical | Medium | 🔴🔴🔴 |
| R15 Server compromise | Critical | Low-Medium | 🔴🔴 |
| R16 ODbL/license contamination | High | Medium | 🟠🟠 |
| R2 Scope creep | High | High | 🟠🟠🟠 |
| R3 Moderation hell | High | Medium | 🟠🟠 |
| R7 Geolocation restrictions | High | Certain | 🟠🟠🟠 |
| R11 Maintainer burnout | High | Medium | 🟠🟠 |
| R13 Legal liability | High | Low | 🟠 |
| R4 Spam instances | Medium | Medium | 🟡🟡 |
| R5 Duplicate POIs | Medium | High | 🟡🟡 |
| R6 AP complexity | Medium | Medium | 🟡 |
| R9 OSM backlash | Medium | Low | 🟡 |
| R10 Competition | Medium | Low | 🟡 |
| R12 Data quality | Medium | Medium | 🟡 |
| R14 Fragmentation | Medium | Low | 🟡 |
| R17 Overpass misuse | Medium | Low | 🟡 |

---

## Fact-check questions for agents

1. Did we miss risks specific to federated platforms? (check Mastodon's incident history)
2. R1 Stalking — are there known incident reports for location apps (Life360, Strava, Foursquare)? Patterns?
3. R8 GDPR — what specific fines have been levied against federated services (if any)?
4. R7 Background geolocation — what are Safari's restrictions in 2026?
5. R13 Legal liability — any notable cases involving Mastodon admins?
6. The risk/probability matrix — is the scoring rational?
7. Are there other critical risks we did not mention? (cryptocurrency abuse for anonymous stalking? AI-generated fake POIs?)
8. R15 — is there precedent for Mastodon instance breaches? How were they handled?
9. R16 — which real ODbL boundary cases are most dangerous for a mixed POI/review database?
10. R17 — which OSM import guidelines must the PBF/import pipeline follow?
