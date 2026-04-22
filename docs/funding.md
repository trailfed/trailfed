---
title: Funding and sustainability
version: 0.1
status: draft
updated: 2026-04-22
---

# 10. Funding and sustainability

## Financial philosophy

TrailFed is an **infrastructure open-source project**, not a VC-backed startup. The model resembles Mastodon, Matrix, or Nominatim: sustained by a mix of grants + community donations + optional commercial services around the project, with no monetization of the core product.

**Goal:** sustainable for 1–2 full-time maintainers funded by grants, stretched if needed. Not a unicorn.

## Expenses

### Central infrastructure (minimal)

| Item | Cost / year |
|---|---|
| Domain `trailfed.org` | ~$15 |
| Landing page (Cloudflare Pages free tier or GitHub Pages) | $0 |
| GitHub org | $0 |
| Instance directory backend (~$5/mo VPS) | ~$60 |
| Documentation hosting (ReadTheDocs free for OSS) | $0 |
| CI/CD (GitHub Actions free quota) | $0 |
| **Total central infrastructure** | **~$75/year** |

### Reference instance (`poi.[operator instance]` if [operator instance] hosts it)

| Item | Cost / month |
|---|---|
| VPS (Hetzner CX32 — 4GB RAM, 2 vCPU, 80 GB) | €6–8 |
| Domain (already owned) | $0 |
| Backup storage (Hetzner Storage Box) | €3 |
| **Total** | **~€10/mo** |

### Developer / maintainer compensation

Sustainable operations require:
- 1 full-time lead maintainer: ~$60k–$80k/year (Europe; rest of world variable)
- 2–3 part-time contractors for specific features: ~$20k total
- Security audit (one-time in Phase 5): ~$10k–$20k

**Total annual budget target:** $80k–$100k for sustained operations.

## Funding sources

### 1. NLNet Foundation (priority #1)

**Why:** [NLNet](https://nlnet.nl/) is a Dutch foundation funded by the EU NGI0 (Next Generation Internet) programme. **It explicitly funds federated protocols and decentralized services.**

**Relevant programs:**
- **NGI0 Entrust** ([nlnet.nl/entrust](https://nlnet.nl/entrust/)) — for trust/privacy/identity projects. Grants €5k–€50k.
- **NGI Zero Commons Fund** ([nlnet.nl/commonsfund](https://nlnet.nl/commonsfund/)) — a general fund for commons infrastructure. €5k–€50k.
- **NGI0 Core** — for core internet infrastructure.

**Application:** 4 cycles per year; the preliminary proposal is fast (~2 weeks review).

**Our fit:** federated protocol + privacy-preserving + open source + serves civic good — a perfect match.

**Target grant:** €50–100k for Phases 1–2, then renewal for Phases 3–4. After the roadmap fact-check, 18–24 months to v1.0 without live location is more realistic; the funding plan must cover at least one full-time maintainer or significantly narrow scope.

### 2. Prototype Fund Germany

**Why:** [Prototype Fund](https://prototypefund.de/) is a German fund financed by the Federal Ministry of Education and Research (BMBF). Supports public-interest tech.

**Grant amount:** €47,500 per project for 6 months.

**Our fit:** open source + civic tech + privacy.

**Constraint:** only German citizens/residents are eligible — may require a co-maintainer in Germany.

### 3. Mozilla Technology Fund

**Why:** the [Mozilla Technology Fund](https://foundation.mozilla.org/en/what-we-fund/awards/mozilla-technology-fund/) funds open-source tech with a social-good focus.

**Grant amount:** $50k per project.

**Current focus:** varies year to year. May carry a "privacy" or "decentralized web" theme when we apply.

### 4. EU Open Data initiatives

**Programmes:**
- **European Data Spaces** — the EU funds tourism data space development. TrailFed as a POI standard for the tourism sector could fit.
- **Horizon Europe** grants — large-scale research funding (EU consortium required).
- **Digital Europe Programme** — infrastructure grants.

**Constraint:** large grants (€100k+) but they require consortium partners, grant-writing expertise, and months of application work.

### 5. OpenStreetMap Foundation microgrants

**Why:** [OSMF microgrants](https://wiki.osmfoundation.org/wiki/Microgrants) fund tools in the OSM ecosystem.

**Grant amount:** $1k–$5k.

**Our fit:** TrailFed uses OSM extensively and contributes back via user OAuth submissions.

**Use case:** funding specific OSM integration features.

### 6. Community donations (Open Collective)

**Why:** [Open Collective](https://opencollective.com/) is a transparent funding platform for open-source communities. Mastodon, Pleroma, and Mobilizon all use it.

**Expected volume:** $500–$5,000/mo after launch if the community grows.

**Transparent ledger:** all income and expenses are publicly visible. Builds trust.

### 7. GitHub Sponsors / Patreon

**Individual maintainer sponsorships:** complement to Open Collective. Some donors prefer direct individual support.

**Expected:** $200–$2k/mo for the lead maintainer.

### 8. Managed hosting referral fees

Post-v1.0: partnerships with managed hosting providers:
- **PikaPods** — they pay a % per referral
- **Elestio** — similar
- **Cloudron** — similar

**Expected:** $500–$2k/mo after Phase 5.

Not a primary income stream, but a supplement.

### 9. Enterprise consulting / custom development (optional)

Situations where this is acceptable:
- A tourism board wants a custom instance → paid setup engagement
- A commercial operator wants a specific feature → sponsored development (the feature remains open source)

**Never:** proprietary forks, closed-source features, exclusive access.

## Sustainability timeline

### Year 1 (Phases 0–2)
- Primary funding: NLNet grant (applied for in Phase 0, received in Phase 1)
- Maintainer: part-time or full-time depending on the grant; $30k–$60k
- Expenses: ~$1k infrastructure + maintainer + small audit/legal budget = $35k–$70k
- **Break-even:** via NLNet €50k

### Year 2 (Phases 3–5)
- NLNet renewal or a second grant (Prototype Fund, Mozilla)
- Open Collective starts generating $500–$2k/mo
- Maintainer: full-time target
- Expenses: ~$1k infrastructure + $60k–$80k maintainer + security/privacy review = $75k–$110k
- **Break-even:** via grants + donations

### Year 3+ (post-v1.0 ecosystem)
- Lead maintainer full-time ($60k–$80k)
- Community contributions (possibly a second paid contractor)
- Open Collective $2k–$5k/mo
- Consulting / partnerships as additional income
- **Goal:** self-sustaining through diversified income

## [operator instance] role

[operator instance] **does not control** the project. It can, however, contribute:

### Bootstrapping support (Phases 0–1)
- Cost of the first VPS for the `poi.[operator instance]` instance: €10/mo
- Partial compensation of maintainer time (if Aleksey is lead): $500–$1,000/mo for the first 6 months

### Long-term role
- First consumer / reference instance — demonstrates that it works
- Ambassador in travel-in-motion communities: RV/vanlife, overland, sailing, motorcycle travel, bike touring, and digital nomads
- Consumer via the REST API (integration at [operator instance]/maps)
- Non-exclusive — if another instance becomes more popular, that's fine

### Governance firewall
- [operator instance] has **no** veto power in the project
- Any contributor can become a maintainer
- Decisions go through GitHub Discussions + RFC process

## Financial transparency

Principles:
- **Open Collective** — the full income/expense ledger is public
- **Quarterly reports** — the maintainer publishes financials on the blog
- **No hidden contracts** — commercial arrangements are anonymized, but transaction amounts are disclosed
- **Community veto:** if >50% of monthly donors raise a concern, the decision is revisited

## Red flags / anti-patterns

What we **avoid**:

- **VC funding** — creates pressure to monetize the core, killing openness
- **Proprietary enterprise tier** — fragments the codebase
- **"Free for hobbyists, paid for commercial"** — hard to enforce, alienates the community
- **Single-vendor lock-in** — no exclusive deals with any company
- **Closed governance** — no private Slack behind the public GitHub

## Risk mitigation

### Risk: Grant rejected
**Mitigation:** parallel applications to multiple funds (NLNet + Prototype Fund + Mozilla). At least one should land.

### Risk: Lead maintainer burnout
**Mitigation:** explicit plan for part-time in Year 1, transitioning to full-time only once sustainable. Rotating responsibilities.

### Risk: Community donations dry up
**Mitigation:** diversified funding sources. No single category should exceed 60% of income.

### Risk: Legal attack (trademark, data ownership)
**Mitigation:** legal consultation included in grants. Foundation/association structure after Phase 5 if revenue grows significantly.

---

## Fact-check questions for agents

1. **NLNet NGI0 Entrust** — exact grant amounts and current cycle schedule? (check nlnet.nl)
2. **Prototype Fund** — is the German citizenship requirement actual?
3. **Mozilla Technology Fund** — current theme and application process for 2026?
4. **Open Collective** — does the Mastodon team publicly reveal actual donation numbers?
5. **PikaPods / Elestio / Cloudron** — are the referral programs real?
6. **European Data Spaces Tourism** — does this data space initiative exist?
7. **OSMF microgrants** — is there an active cycle in 2026?
8. **VPS pricing** — is Hetzner CX32 at €6/mo current? Are the specs correct?
9. **Maintainer cost Europe** — is $60–80k realistic for a Go developer with federated-protocol experience?
10. **Security audit cost** — is $10–20k realistic for an ActivityPub-focused audit?
