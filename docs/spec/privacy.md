---
title: Privacy и Safety Model
version: 0.1
status: draft
updated: 2026-04-22
---

# 08. Privacy, Safety и Threat Model

## TL;DR

Live location sharing — **высокорисковая функциональность**. Ошибки в дизайне могут привести к stalking, harassment, domestic violence. После fact-check live location не входит в ранний MVP/v1.0 без отдельного privacy/security review. Наш подход: opt-in по умолчанию off, explicit allowlist, no public geohash channels, multiple precision tiers, stealth mode, admin controls.

## Threat Model

### Актёры, которые могут атаковать

#### 1. Stalker (ex-partner, known person)
- **Цель:** определить физическое местоположение жертвы
- **Методы:** создание fake аккаунтов, social engineering чтобы получить follow acceptance, заглядывание в публичные timeline
- **Рисk:** высокий — живая локация критична

#### 2. Domestic abuser
- **Цель:** контроль над partner в реальном времени
- **Методы:** доступ к устройству, принуждение к sharing, использование как evidence for separation control
- **Рисk:** ЭКСТРЕМАЛЬНО высокий. Dangerous feature для survivors

#### 3. Harassment mob
- **Цель:** нападение группой на одного пользователя
- **Методы:** координация через social media, follow-on-mass, coordinated reporting
- **Рисk:** средний (можно mitigate через rate limiting + moderation)

#### 4. Data broker / profilier
- **Цель:** сбор геоданных для продажи
- **Методы:** API scraping, создание множественных аккаунтов
- **Рисk:** средний (мы не храним long-term granular history по умолчанию)

#### 5. State actor
- **Цель:** surveillance activists, dissidents, journalists
- **Методы:** legal demands, server seizure
- **Рисk:** variable (зависит от jurisdiction где instance)

#### 6. Malicious instance admin
- **Цель:** admin может видеть всё что в базе
- **Риск:** средний — users должны доверять instance admin

#### 7. Scraper / research bot
- **Цель:** сбор данных for AI/analysis
- **Рисk:** низкий (мы можем rate-limit и authenticate API)

## Защитные механизмы

### Layer 1: Privacy by default

**Новый пользователь:**
- Live location sharing = **OFF**
- Check-in history = **visible только self**
- Profile visibility = **unlisted** (не в public directory)
- DM default = **followers only**

User должен явно opt-in каждую функциональность.

### Layer 2: Three precision tiers для live location

Когда пользователь opt-in в live location, он выбирает **precision**:

#### EXACT
- Точные координаты (3-5 метров accuracy)
- **Аудитория:** только selected followers (explicit allowlist, не "all followers")
- **Ephemeral:** TTL 24 часа (потом auto-delete)
- **Максимум жёсткая опция** — только для trusted friends

#### CITY
- Round up до nearest city (~10-50 км accuracy)
- **Аудитория:** все followers
- **Persistent:** сохраняется history
- **Дефолт для active sharing**

#### COUNTRY
- Only country code (2-letter ISO)
- **Аудитория:** public (visible всем если профиль public)
- **Persistent:** yes
- **Минимально раскрывающий уровень**

### MVP policy

До отдельного safety audit:
- No public "nearby users" map
- No public `location:<geohash>` channels
- No automatic sharing with all followers
- EXACT только explicit allowlist + ghost delay by default
- Instance admin can disable live location entirely; default public instances should keep it disabled until v1.x

### Layer 3: Active defenses

#### Stealth Mode
- Global kill-switch: отключает ВСЮ location sharing instantly
- One-tap UI (в header app)
- После активации: live location исчезает с карт followers немедленно
- Остаётся выключенным до manual re-enable

#### Ghost Delay
- Показывать location с задержкой 30 мин (по умолчанию, customizable 5-120 min)
- Предотвращает real-time stalking (stalker видит где был 30 мин назад, не где сейчас)
- User-controlled

#### Fuzz Radius
- Randomize position в пределах ±500м от истинной точки
- Prevents pinpointing exact address
- Always on для CITY/COUNTRY tiers

### Layer 4: Control over followers

- **Approve follows:** по умолчанию новый follower не получает live location visibility
- **Separate acl for location:** отдельный список "кто видит live location" — не совпадает с "следуют за мной"
- **Revoke access:** любой follower может быть удалён из location allowlist
- **Block:** полностью блокирует access

### Layer 5: Instance-level admin controls

Instance admin может:
- Отключить live location feature глобально на instance (для family/closed instance)
- Restrict max precision (например, на instance "no EXACT, max CITY")
- Ограничить federation of location data (не принимать snapshots от графлиста peers)

### Layer 6: Auditing

- **Access log:** user может видеть "alice.example.com fetched my location 5 minutes ago"
- **Notifications:** push notification при first-time location view
- **Export log:** download полного audit log as CSV

## GDPR Compliance

### Legal basis
- Live location: **consent** (Art. 6(1)(a))
- Account data: **contract** (Art. 6(1)(b))
- Analytics: **legitimate interest** (Art. 6(1)(f)), opt-out available

### Data subject rights

#### Right to access (Art. 15)
- User downloads ZIP archive:
  - All their posts
  - All check-ins
  - Location history (если сохраняется)
  - Profile settings
  - Follower list (anonymized if requested)

#### Right to erasure (Art. 17)
- "Delete my account" в settings
- Cascading delete: posts, check-ins, location history
- Federation: отправка `Delete{Actor}` activity всем peers (они должны удалить у себя)
- **Backup retention** — 30 дней (потом auto-purge)

#### Right to rectification (Art. 16)
- Edit/delete individual posts
- Edit/delete individual check-ins
- Edit/delete location history entries

#### Right to data portability (Art. 20)
- Export в ActivityPub format (machine-readable)
- Import на другой instance (Mastodon-style migration)

### Data minimization (Art. 5(1)(c))
- Location data retention: по умолчанию 30 дней, configurable
- Raw IP addresses не сохраняем в logs (только hashed)
- Metadata минимальная

### Consent management
- Granular consent screen при регистрации:
  - [ ] Allow live location sharing
  - [ ] Allow analytics (opt-in, не opt-out)
  - [ ] Allow email для instance announcements
- Audit trail всех consent changes

### Data processor agreements
- Protocols с third-party services (Centrifugo если hosted, tile provider если внешний)
- DPA templates в docs для instance admins

### Privacy-by-design (Art. 25)
- Stealth mode — default off значит user опт-in explicit
- Minimum data collection
- Покрыто всё в Layers 1-6 выше

## Abuse handling

### Report user flow
1. Любой пользователь может report content:
   - Spam, harassment, illegal content, misleading POI
2. Отправляется в admin moderation queue
3. Admin видит context, может:
   - Warn user
   - Suspend (temporarily)
   - Ban (permanent)
   - Delete content
   - Block follower relation

### Defederation
- Instance admin может defederate от другого instance
- Все incoming/outgoing activities stopped
- Optionally: cascade delete existing content from defederated peer

### Honeypots and detection
- Rate limiting на fast follows (anti-stalker):
  - Новый account (<7 дней старый) не может follow >10 users/день
  - Follow >100 users/неделя triggers review
- Fast check-ins: >5 check-ins за 10 минут = anti-spam
- Geographic impossibilities: check-in 1000 км от previous за 10 мин = flag

## Specific survivor-safety considerations

### Для жертв domestic violence

**Common scenario:** abusive partner knows user's credentials or has device access.

**TrailFed defenses:**
- **Stealth mode preservation through sessions:** stealth toggle survives re-login
- **Panic mode:** PIN-protected panic trigger → immediately:
  - Opens decoy/safe screen where platform allows
  - Cascading deletes все live location data
  - Signs out all sessions
  - Optionally contacts emergency contact only if user configured it and understands risk
- **Masked timestamps:** check-in times can be published with ±day fuzz для historical posts
- **Anti-pattern:** NO "login from another device" email — abuser reading user's email

Важно: "hide app icon" нельзя обещать для PWA и большинства обычных mobile apps. Это зависит от OS/platform и может быть impossible или опасно, если создаёт ложное чувство безопасности.

### Для journalists / activists

- **High-security mode:** no historical location retained, no check-ins persist, everything ephemeral
- **Anti-correlation:** IP addresses не logged, session IDs rotated
- **Hardened peer trust:** opt-in "only federate with trusted instances" mode

## Security audits

- Third-party audit перед launch (Phase 5)
- Bug bounty program после launch
- Annual pen-testing
- Incident response plan documented

---

## Fact-check questions для агентов

1. **GDPR Art. 6/15/17/20** — номера статей корректны?
2. **Stalkerware research** — есть ли исследования о how location sharing apps used for abuse (Citizen Lab, EFF)?
3. **Domestic violence + tech** — рекомендации от NNEDV (National Network to End Domestic Violence) — актуальны ли предложенные защиты?
4. **Mastodon privacy model** — как они делают? Есть ли у них security audit?
5. **Live location apps** — как делают privacy Strava (flyby), Life360, Find My?
6. **Ghost delay 30 мин** — индустриальный standard для anti-stalking? Или нужно больше?
7. **Fuzz radius 500м** — достаточно для privacy? Mapbox и другие используют какие значения?
8. **GDPR DPA templates** — доступны ли open-source для federated services?
9. **EU PUEB Data Act 2026** — есть ли new regulations affecting us?
10. **California CCPA/CPRA** — требования data portability совместимы с GDPR approach?
11. **PWA/native limitations:** что реально можно сделать на iOS/Android/PWA для panic/stealth mode?
12. **Public nearby:** есть ли безопасный вариант public nearby, или feature должна навсегда остаться allowlist-only?
