---
title: Funding и устойчивость
version: 0.1
status: draft
updated: 2026-04-22
---

# 10. Funding и устойчивость

## Финансовая философия

TrailFed — **инфраструктурный open-source проект**, не VC-backed startup. Модель похожа на Mastodon, Matrix, или Nominatim: поддерживается комбинацией grants + community donations + optional commercial services around project, без core-product монетизации.

**Цель:** sustainable для 1-2 full-time maintainers на grants + stretched if needed. Не unicorn.

## Расходы

### Центральная инфраструктура (минимальна)

| Артикул | Стоимость/год |
|---|---|
| Domain `trailfed.org` | ~$15 |
| Landing page (Cloudflare Pages free tier или GitHub Pages) | $0 |
| GitHub org | $0 |
| Instance directory backend (~$5/мес VPS) | ~$60 |
| Documentation hosting (ReadTheDocs free for OSS) | $0 |
| CI/CD (GitHub Actions free quota) | $0 |
| **Total центральной инфры** | **~$75/год** |

### Reference instance (`poi.[operator instance]` если [operator instance] хостит)

| Артикул | Стоимость/мес |
|---|---|
| VPS (Hetzner CX32 — 4GB RAM, 2 vCPU, 80 GB) | €6-8 |
| Domain (already owned) | $0 |
| Backup storage (Hetzner Storage Box) | €3 |
| **Total** | **~€10/мес** |

### Developer / maintainer compensation

Для sustainable operations нужны:
- 1 full-time lead maintainer: ~$60k-80k/year (Europe, остальной мир variable)
- 2-3 part-time contractors для specific features: ~$20k total
- Security audit (one-time Phase 5): ~$10-20k

**Total annual budget target:** $80k-100k для sustained operations.

## Источники финансирования

### 1. NLNet Foundation (приоритет #1)

**Почему:** [NLNet](https://nlnet.nl/) — голландский foundation, funded by EU NGI0 (Next Generation Internet) program. **Явно финансирует federated protocols и decentralized services**.

**Relevant programs:**
- **NGI0 Entrust** ([nlnet.nl/entrust](https://nlnet.nl/entrust/)) — для trust/privacy/identity проектов. Grants €5k-€50k.
- **NGI Zero Commons Fund** ([nlnet.nl/commonsfund](https://nlnet.nl/commonsfund/)) — общий fund для commons infrastructure. €5k-€50k.
- **NGI0 Core** — для core internet infrastructure.

**Подача:** 4 cycles в год, preliminary proposal быстрый (~2 weeks review).

**Наш fit:** federated protocol + privacy-preserving + open source + serves civic good → perfect match.

**Target grant:** €50-100k для Phase 1-2, потом renewal для Phase 3-4. После fact-check roadmap реалистичнее считать 18-24 месяца до v1.0 без live location; funding plan должен покрывать минимум один full-time maintainer или сильно сужать scope.

### 2. Prototype Fund Germany

**Почему:** [Prototype Fund](https://prototypefund.de/) — немецкий fund, funded by Federal Ministry of Education and Research (BMBF). Supports public-interest tech.

**Grant amount:** €47,500 per project for 6 months.

**Our fit:** open source + civic tech + privacy.

**Constraint:** only German citizens/residents eligible — может требовать co-maintainer в Germany.

### 3. Mozilla Technology Fund

**Почему:** [Mozilla Technology Fund](https://foundation.mozilla.org/en/what-we-fund/awards/mozilla-technology-fund/) funds open-source tech with social good focus.

**Grant amount:** $50k per project.

**Current focus:** varies year-to-year. Может иметь theme "privacy" или "decentralized web" когда мы будем апплаиться.

### 4. EU Open Data initiatives

**Программы:**
- **European Data Spaces** — EU funds tourism data space development. TrailFed as POI standard для tourism sector могла бы фитить.
- **Horizon Europe** grants — large-scale research funding (EU consortium required).
- **Digital Europe Programme** — infrastructure grants.

**Constraint:** large grants (€100k+) но требуют consortium partners, grant writing expertise, months of application process.

### 5. OpenStreetMap Foundation microgrants

**Почему:** [OSMF microgrants](https://wiki.osmfoundation.org/wiki/Microgrants) funds OSM ecosystem tools.

**Grant amount:** $1k-$5k.

**Our fit:** TrailFed uses OSM extensively, contributes back via user OAuth submissions.

**Use case:** funding specific OSM integration features.

### 6. Community donations (Open Collective)

**Почему:** [Open Collective](https://opencollective.com/) — transparent funding platform for open-source communities. Mastodon, Pleroma, Mobilizon все используют.

**Expected volume:** $500-$5000/мес после launch, если community грows.

**Transparent ledger:** all income + expenses публично видны. Builds trust.

### 7. GitHub Sponsors / Patreon

**Individual maintainer sponsorships:** complement to Open Collective. Some donors prefer direct individual support.

**Expected:** $200-$2k/мес для lead maintainer.

### 8. Managed hosting referral fees

Post-v1.0: partnerships с managed hosting providers:
- **PikaPods** — они платят % за referrals
- **Elestio** — similar
- **Cloudron** — similar

**Expected:** $500-$2k/мес после Phase 5.

Не primary income, но supplements.

### 9. Enterprise consulting / custom development (optional)

Ситуации когда приемлемо:
- Tourism board wants custom instance → paid setup engagement
- Commercial operator wants specific feature → sponsored development (feature remains open-source)

**Never:** proprietary forks, closed-source features, exclusive access.

## Sustainability timeline

### Year 1 (Phases 0-2)
- Primary funding: NLNet grant (applied в Phase 0, received в Phase 1)
- Maintainer: part-time/full-time depending grant, $30k-$60k
- Expenses: ~$1k infrastructure + maintainer + small audit/legal budget = $35k-$70k
- **Break-even:** via NLNet €50k

### Year 2 (Phases 3-5)
- NLNet renewal или second grant (Prototype Fund, Mozilla)
- Open Collective starts generating $500-$2k/мес
- Maintainer: full-time target
- Expenses: ~$1k infrastructure + $60k-$80k maintainer + security/privacy review = $75k-$110k
- **Break-even:** via grants + donations

### Year 3+ (Post-v1.0 ecosystem)
- Lead maintainer full-time ($60k-$80k)
- Community contributions (possibly 2nd paid contractor)
- Open Collective $2k-$5k/мес
- Consulting/partnerships additional
- **Goal:** self-sustaining через diversified income

## [operator instance] роль

[operator instance] **не контролирует** проект. Но может внести вклад:

### Bootstrapping support (Phases 0-1)
- Стоимость первого VPS для `poi.[operator instance]` instance: €10/мес
- Частичная компенсация maintainer time (если Алексей будет lead): $500-$1000/мес первые 6 месяцев

### Long-term role
- Первый consumer/reference instance — demonstrates что работает
- Ambassador в travel-in-motion communities: RV/vanlife, overland, sailing, motorcycle travel, bike touring и digital nomads
- Consumer through REST API (integration на [operator instance]/maps)
- Non-exclusive — если другой instance становится более популярным, fine

### Governance firewall
- [operator instance] **не имеет** veto power в проекте
- Любой contributor может стать maintainer
- Decisions через GitHub Discussions + RFC process

## Financial transparency

Принципы:
- **Open Collective** — весь income/expense ledger публичный
- **Quarterly reports** — maintainer publishes finances в blog
- **No hidden contracts** — commercial arrangements anonymized but transaction amounts disclosed
- **Community veto:** если >50% monthly donors выражают concern, решение пересматривается

## Red flags / anti-patterns

Чего мы **избегаем**:

- **VC funding** — создаёт pressure для monetization core, killing openness
- **Proprietary enterprise tier** — fragments codebase
- **"Free for hobbyists, paid for commercial"** — hard to enforce, alienates community
- **Single-vendor lock-in** — no exclusive deals with any company
- **Closed governance** — no private Slack за public GitHub

## Risk mitigation

### Risk: Grant не одобрен
**Mitigation:** parallel применения к multiple funds (NLNet + Prototype Fund + Mozilla). Хотя бы один should land.

### Risk: Lead maintainer burnout
**Mitigation:** explicit plan for part-time in Year 1, transitioning to full-time only когда sustainable. Rotating responsibilities.

### Risk: Community donations dry up
**Mitigation:** diversified funding sources. Одна категория не должна быть >60% of income.

### Risk: Legal attack (trademark, data ownership)
**Mitigation:** legal consultation included в grants. Foundation/association structure после Phase 5 if revenue значительно растёт.

---

## Fact-check questions для агентов

1. **NLNet NGI0 Entrust** — точная сумма grants и текущий cycle schedule? (проверить nlnet.nl)
2. **Prototype Fund** — German citizenship requirement actual?
3. **Mozilla Technology Fund** — current theme и application process на 2026?
4. **Open Collective** — Mastodon team reveals actual donations numbers publicly?
5. **PikaPods / Elestio / Cloudron** — referral programs real?
6. **European Data Spaces Tourism** — существует ли такой data space initiative?
7. **OSMF microgrants** — active cycle на 2026?
8. **VPS pricing** — Hetzner CX32 €6/мес актуально? Specs correct?
9. **Maintainer cost Europe** — $60-80k realistic для Go developer с federated protocol experience?
10. **Security audit cost** — $10-20k realistic для ActivityPub-focused audit?
