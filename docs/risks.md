---
title: Риски и митигации
version: 0.1
status: draft
updated: 2026-04-22
---

# 11. Риски и митигации

Честный список что может пойти не так и что мы делаем чтобы уменьшить риск.

## R1: Stalking / preying через live location

**Severity:** 🔴 Critical — может привести к физическому вреду.

**Описание:** злоумышленник (ex-partner, stalker, abuser) использует live location для определения физического местоположения жертвы.

**Mitigation:**
- Opt-in по умолчанию OFF (см. 08_PRIVACY_MODEL.md)
- 3 precision tiers (EXACT/CITY/COUNTRY)
- Stealth mode kill-switch
- Ghost delay (30 min default)
- Fuzz radius (±500m)
- Separate ACL для "кто видит live location" (не совпадает с followers)
- No public geohash/nearby channels in MVP
- Live location deferred beyond v1.0 until safety review
- Instance-level restrictions (admin может globally disable EXACT tier)
- Panic mode для survivors

**Residual risk:** some. Не нулевой — никакая technical mitigation не решает abuse problem fully. Education + admin policies critical.

## R2: Scope creep — попытка сделать всё сразу

**Severity:** 🟠 High — может убить project до v1.0.

**Описание:** добавление features "ещё вот это было бы классно" удлиняет roadmap и разбрасывает focus.

**Mitigation:**
- 7 чётких фаз с scoping boundaries
- Phase 1-3 самодостаточны (MVP = federation foundation + Places + map-first UI)
- Live location explicitly out of v1.0 scope unless safety review approves it
- Quarterly review: что добавили vs. плана?
- Formal RFC process для major features
- Maintainer authority отклонять out-of-scope contributions (без feelings hurt)

**Residual risk:** medium. Community pressure — постоянный вектор.

## R3: Moderation hell (как в Mastodon)

**Severity:** 🟠 High — может отпугнуть users + admins.

**Описание:** instance admins burning out из-за moderation workload. Harassment между instances. Toxic behavior.

**Mitigation:**
- Каждый instance модерирует сам (distributed load)
- Defederation tools built-in
- Reputation scoring per peer
- Clear Code of Conduct templates для admins
- Community support channels для admins
- Trust levels per peer (auto-graylist new peers)

**Residual risk:** medium. Social problems не решаются чисто technical means.

## R4: Spam instances

**Severity:** 🟡 Medium.

**Описание:** злоумышленник поднимает instance, флудит fake POIs, fake check-ins, fake accounts.

**Mitigation:**
- Graylist по умолчанию для new peers (moderation queue)
- Rate limits на federated activities per peer
- Reputation scoring
- Community blocklist sharing (like Mastodon's shared blocklists)
- Geospatial fingerprint detects dup POIs

**Residual risk:** low-medium. Well-established defense patterns.

## R5: Duplicate POIs across federation

**Severity:** 🟡 Medium — UX пробоема.

**Описание:** 2 instances независимо создают POI для same location. Пользователи видят дубликаты на карте.

**Mitigation:**
- Geospatial fingerprint (sha256 of rounded lat/lng + category)
- Merge activities для proposed merges
- UI: "показать похожие POI" при create
- Admin tools для bulk merge
- `trailfed:canonical_uri` для linking aliases

**Residual risk:** low. Ugly but not breaking.

## R6: ActivityPub implementation complexity

**Severity:** 🟡 Medium — barrier для adoption.

**Описание:** HTTP Signatures, JSON-LD, WebFinger, inbox processing — все это tricky. Implementation bugs breaking federation. Дополнительный риск: go-fed mature but low-activity, Fedify active but TypeScript/Node changes backend assumptions.

**Mitigation:**
- Phase 0 spike: Go/go-fed vs TypeScript/Fedify before committing
- Federation test suite (automated)
- Compatibility testing с Mastodon, Pleroma, GoToSocial
- Public interop fixtures and local test peers
- Docs для instance admins о common issues

**Residual risk:** medium. Proven libraries help, but Fediverse interop is still implementation-specific.

## R7: Google/Apple background geolocation restrictions

**Severity:** 🟠 High — fundamental constraint.

**Описание:** Modern mobile browsers (Safari, Chrome) restrict background geolocation heavily. Travel tracks recording в PWA может быть unreliable.

**Mitigation:**
- Explicit warning: "for full tracking, use native app (Phase 6)"
- PWA works для foreground use (open app → track actively)
- Background limitations documented прямо в UI
- Phase 6: Native apps (iOS/Android) с proper background location permissions

**Residual risk:** medium. Inherent OS constraint, only solvable with native.

## R8: GDPR / legal violations

**Severity:** 🔴 Critical — can result in fines, legal action.

**Описание:** violation of GDPR (EU), CCPA (California), or other privacy laws. Potential €20M fines.

**Mitigation:**
- Privacy-by-design model (see 08_PRIVACY_MODEL.md)
- Legal counsel reviews privacy policy (budgeted в grant)
- Transparent data handling
- Right-to-delete implemented
- Data Processing Agreements (DPA) templates для admins
- Jurisdictional awareness (instance admins responsible per jurisdiction)

**Residual risk:** medium. Each jurisdiction has own laws. Can't guarantee 100% compliance for every admin.

## R9: OSM community backlash

**Severity:** 🟡 Medium — reputation risk.

**Описание:** OSM community может воспринять нас как leeching (consume OSM, not contribute). Negative diary posts, social media.

**Mitigation:**
- Additive philosophy clearly communicated
- Regular contribution through user OAuth (Phase 4+)
- Reports of data quality issues to OSM
- Attend State of the Map conferences
- Public blog posts about our OSM usage + contributions
- iOverlander precedent (they cohabit successfully)

**Residual risk:** low. Transparent behavior + communication address most concerns.

## R10: GoToSocial / Bonfire / Fedify ecosystem делают то же быстрее

**Severity:** 🟡 Medium — competition.

**Описание:** GoToSocial adds geo features. Bonfire finalizes geosocial extension. Fedify examples evolve into a geosocial server. TrailFed becomes less differentiated.

**Mitigation:**
- Travel/overland focus differentiated от general-purpose
- Cross-federation с обоими (they become peers, not competitors)
- Unique features: travel POI federation + map-first UX + OSM/import/moderation tooling
- Community relationships — не winner-takes-all в Fediverse
- Possible future merger если tactical aligns

**Residual risk:** low. Fediverse is not zero-sum.

## R11: Solo-maintainer burnout

**Severity:** 🟠 High — может привести к abandonment.

**Описание:** lead maintainer (особенно в solo mode) burns out, проект замедляется или умирает.

**Mitigation:**
- Part-time start, не full-time immediately
- Active contributor recruitment с Phase 1
- Clear communication — "I can't respond to every issue"
- Designated second maintainer before Phase 3
- Documentation ensures project continues even if primary leaves
- Funding для sustainability (not just surviving)

**Residual risk:** medium. Common OSS problem, requires ongoing management.

## R12: Data quality issues (misleading POIs)

**Severity:** 🟡 Medium — can cause real-world problems.

**Описание:** user posts POI at dangerous/wrong location. Another user arrives, gets in trouble.

**Mitigation:**
- Quality tiers (0-3) clearly displayed
- `tier 0 = unverified` badge always visible
- Reports/flagging mechanism
- Time-based decay: POIs not visited в 18+ months flagged as `needs_verification`
- Community moderation: multiple independent verifications boost tier
- Terms of Use disclaimer

**Residual risk:** medium. Physical world hazards beyond our control.

## R13: Legal liability для instance admins

**Severity:** 🟠 High — admins могут face legal action.

**Описание:** User posts illegal content (stalking, defamation, illegal POI). Admin потенциально liable в some jurisdictions.

**Mitigation:**
- Clear Terms of Use templates
- Notice-and-takedown procedures documented
- Admin can defederate abusive peers
- Legal counsel consult в grant budget
- Jurisdictional advice in docs ("this is not legal advice, consult local lawyer")

**Residual risk:** medium. Depends heavily on jurisdiction.

## R14: Protocol fragmentation

**Severity:** 🟡 Medium — ecosystem risk.

**Описание:** другой project публикует incompatible "federated travel standard". Ecosystem splits.

**Mitigation:**
- First-mover advantage — publish spec early
- Reuse W3C ActivityPub — не изобретаем свой
- Minimal extensions — easy compatibility
- Active в swicg/geosocial W3C group
- Cross-federate с любыми compatible projects

**Residual risk:** low. Precedent: ActivityPub уже unified social fediverse.

## R15: Server compromise → user data leak

**Severity:** 🔴 Critical — privacy breach.

**Описание:** instance server hacked, user data (including sensitive location history) leaked.

**Mitigation:**
- Encryption at rest (configurable)
- Minimal data retention (default 30 дней для location)
- Security audit pre-v1.0
- Bug bounty program
- Incident response plan documented
- Users opted-in для high-precision data see clear warnings

**Residual risk:** medium. All online services have this risk. We mitigate через minimal data + audits.

## R16: ODbL/license contamination

**Severity:** 🟠 High — может заблокировать adoption и вызвать legal conflict.

**Описание:** OSM-derived data, user reviews, partner datasets и remote instance data смешиваются так, что невозможно понять license/attribution/share-alike obligations.

**Mitigation:**
- `place_sources` / field-level provenance
- Clear export licenses
- OSM-derived fields marked ODbL
- Reviews/check-ins licensed separately
- Legal review before public data exports

**Residual risk:** medium. ODbL нюансы сложные, нужен review.

## R17: Overpass misuse / OSM infra abuse

**Severity:** 🟡 Medium — reputation + reliability risk.

**Описание:** initial import через public Overpass создаёт нагрузку, ломается на rate limits, вызывает негатив OSM community.

**Mitigation:**
- Bulk import только через PBF extracts
- Overpass only small bbox/dev queries
- Respect fair-use and 429
- Document how to self-host importer

**Residual risk:** low если pipeline соблюдается.

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

## Fact-check questions для агентов

1. Пропустили ли мы риски специфичные для federated platforms? (проверить Mastodon incident history)
2. R1 Stalking — есть ли известные incident reports для location apps (Life360, Strava, Foursquare)? Patterns?
3. R8 GDPR — какие конкретные fines были для federated services (если были)?
4. R7 Background geolocation — Safari restrictions на 2026 какие?
5. R13 Legal liability — какие notable cases для Mastodon admins?
6. Матрица риск/probability — рacional ли scoring?
7. Существуют ли другие критические риски которые мы не упомянули? (cryptocurrency abuse для anonymous stalking? AI-generated fake POIs?)
8. R15 — есть ли precedent Mastodon instance breaches? Как они handled?
9. R16 — какие реальные ODbL boundary cases наиболее опасны для mixed POI/review database?
10. R17 — какие OSM импорт-guidelines нужно соблюдать для PBF/import pipeline?
