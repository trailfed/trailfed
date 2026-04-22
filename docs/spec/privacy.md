---
title: Privacy and Safety Model
version: 0.1
status: draft
updated: 2026-04-22
---

# 08. Privacy, Safety and Threat Model

## TL;DR

Live location sharing is a **high-risk feature**. Design mistakes can lead to stalking, harassment, and domestic violence. After fact-checking, live location is not included in the early MVP/v1.0 without a separate privacy/security review. Our approach: opt-in, off by default, explicit allowlist, no public geohash channels, multiple precision tiers, stealth mode, admin controls.

## Threat Model

### Actors who may attack

#### 1. Stalker (ex-partner, known person)
- **Goal:** determine the victim's physical location
- **Methods:** creating fake accounts, social engineering to obtain follow acceptance, scraping public timelines
- **Risk:** high — live location is critical

#### 2. Domestic abuser
- **Goal:** real-time control over a partner
- **Methods:** device access, coercion to share, using data as evidence for separation control
- **Risk:** EXTREMELY high. A dangerous feature for survivors

#### 3. Harassment mob
- **Goal:** group attack on a single user
- **Methods:** coordination via social media, mass follows, coordinated reporting
- **Risk:** medium (mitigable via rate limiting + moderation)

#### 4. Data broker / profiler
- **Goal:** collect geo data for sale
- **Methods:** API scraping, creating many accounts
- **Risk:** medium (we do not store long-term granular history by default)

#### 5. State actor
- **Goal:** surveillance of activists, dissidents, journalists
- **Methods:** legal demands, server seizure
- **Risk:** variable (depends on the instance's jurisdiction)

#### 6. Malicious instance admin
- **Goal:** an admin can see everything in the database
- **Risk:** medium — users must trust the instance admin

#### 7. Scraper / research bot
- **Goal:** data collection for AI/analysis
- **Risk:** low (we can rate-limit and authenticate the API)

## Defense mechanisms

### Layer 1: Privacy by default

**New user:**
- Live location sharing = **OFF**
- Check-in history = **visible only to self**
- Profile visibility = **unlisted** (not in the public directory)
- DM default = **followers only**

The user must explicitly opt in to each feature.

### Layer 2: Three precision tiers for live location

When a user opts in to live location, they choose a **precision**:

#### EXACT
- Exact coordinates (3–5 meter accuracy)
- **Audience:** only selected followers (explicit allowlist, not "all followers")
- **Ephemeral:** TTL 24 hours (then auto-deleted)
- **Strictest option** — only for trusted friends

#### CITY
- Rounded to the nearest city (~10–50 km accuracy)
- **Audience:** all followers
- **Persistent:** history is stored
- **Default for active sharing**

#### COUNTRY
- Country code only (2-letter ISO)
- **Audience:** public (visible to everyone if the profile is public)
- **Persistent:** yes
- **Minimally revealing level**

### MVP policy

Until a dedicated safety audit:
- No public "nearby users" map
- No public `location:<geohash>` channels
- No automatic sharing with all followers
- EXACT only via explicit allowlist + ghost delay by default
- Instance admins can disable live location entirely; default public instances should keep it disabled until v1.x

### Layer 3: Active defenses

#### Stealth Mode
- Global kill-switch: disables ALL location sharing instantly
- One-tap UI (in the app header)
- Once activated: live location disappears from followers' maps immediately
- Stays disabled until manually re-enabled

#### Ghost Delay
- Show location with a 30-minute delay (default, customizable 5–120 min)
- Prevents real-time stalking (the stalker sees where the user was 30 min ago, not now)
- User-controlled

#### Fuzz Radius
- Randomize position within ±500 m of the true point
- Prevents pinpointing the exact address
- Always on for CITY/COUNTRY tiers

### Layer 4: Control over followers

- **Approve follows:** by default, a new follower does not gain live-location visibility
- **Separate ACL for location:** a separate "who sees live location" list — not the same as "who follows me"
- **Revoke access:** any follower can be removed from the location allowlist
- **Block:** completely blocks access

### Layer 5: Instance-level admin controls

Instance admins can:
- Disable the live location feature globally on the instance (for family/closed instances)
- Restrict maximum precision (e.g., on an instance, "no EXACT, max CITY")
- Limit federation of location data (do not accept snapshots from graylisted peers)

### Layer 6: Auditing

- **Access log:** a user can see "alice.example.com fetched my location 5 minutes ago"
- **Notifications:** push notification on the first-time location view
- **Export log:** download the full audit log as CSV

## GDPR Compliance

### Legal basis
- Live location: **consent** (Art. 6(1)(a))
- Account data: **contract** (Art. 6(1)(b))
- Analytics: **legitimate interest** (Art. 6(1)(f)), opt-out available

### Data subject rights

#### Right to access (Art. 15)
- User downloads a ZIP archive:
  - All their posts
  - All check-ins
  - Location history (if retained)
  - Profile settings
  - Follower list (anonymized if requested)

#### Right to erasure (Art. 17)
- "Delete my account" in settings
- Cascading delete: posts, check-ins, location history
- Federation: send a `Delete{Actor}` activity to all peers (they must delete on their side)
- **Backup retention** — 30 days (then auto-purged)

#### Right to rectification (Art. 16)
- Edit/delete individual posts
- Edit/delete individual check-ins
- Edit/delete location history entries

#### Right to data portability (Art. 20)
- Export in ActivityPub format (machine-readable)
- Import to another instance (Mastodon-style migration)

### Data minimization (Art. 5(1)(c))
- Location data retention: 30 days by default, configurable
- Raw IP addresses are not stored in logs (hashed only)
- Minimal metadata

### Consent management
- Granular consent screen at registration:
  - [ ] Allow live location sharing
  - [ ] Allow analytics (opt-in, not opt-out)
  - [ ] Allow email for instance announcements
- Audit trail of all consent changes

### Data processor agreements
- Agreements with third-party services (Centrifugo if hosted, tile provider if external)
- DPA templates in docs for instance admins

### Privacy-by-design (Art. 25)
- Stealth mode — default off means the user opts in explicitly
- Minimal data collection
- Everything covered in Layers 1–6 above

## Abuse handling

### Report user flow
1. Any user can report content:
   - Spam, harassment, illegal content, misleading POI
2. Sent to the admin moderation queue
3. Admin sees context, and can:
   - Warn user
   - Suspend (temporarily)
   - Ban (permanent)
   - Delete content
   - Block the follower relation

### Defederation
- An instance admin can defederate from another instance
- All incoming/outgoing activities stopped
- Optionally: cascade delete existing content from the defederated peer

### Honeypots and detection
- Rate limiting on fast follows (anti-stalker):
  - A new account (<7 days old) cannot follow >10 users/day
  - Following >100 users/week triggers review
- Fast check-ins: >5 check-ins within 10 minutes = anti-spam
- Geographic impossibilities: a check-in 1000 km from the previous one within 10 min = flag

## Specific survivor-safety considerations

### For domestic violence victims

**Common scenario:** an abusive partner knows the user's credentials or has device access.

**TrailFed defenses:**
- **Stealth mode preservation through sessions:** the stealth toggle survives re-login
- **Panic mode:** PIN-protected panic trigger → immediately:
  - Opens a decoy/safe screen where the platform allows
  - Cascading deletes all live location data
  - Signs out all sessions
  - Optionally contacts an emergency contact only if the user configured it and understands the risk
- **Masked timestamps:** check-in times can be published with ±day fuzz for historical posts
- **Anti-pattern:** NO "login from another device" email — the abuser may be reading the user's email

Important: "hide app icon" cannot be promised for PWAs and most ordinary mobile apps. It depends on the OS/platform and may be impossible or dangerous if it creates a false sense of security.

### For journalists / activists

- **High-security mode:** no historical location retained, no check-ins persisted, everything ephemeral
- **Anti-correlation:** IP addresses not logged, session IDs rotated
- **Hardened peer trust:** opt-in "only federate with trusted instances" mode

## Security audits

- Third-party audit before launch (Phase 5)
- Bug bounty program after launch
- Annual pen-testing
- Documented incident response plan

---

## Fact-check questions for agents

1. **GDPR Art. 6/15/17/20** — are the article numbers correct?
2. **Stalkerware research** — is there research on how location-sharing apps are used for abuse (Citizen Lab, EFF)?
3. **Domestic violence + tech** — are the proposed defenses in line with NNEDV (National Network to End Domestic Violence) recommendations?
4. **Mastodon privacy model** — how do they do it? Do they have a security audit?
5. **Live location apps** — how do Strava (flyby), Life360, Find My handle privacy?
6. **Ghost delay 30 min** — is this an industry standard for anti-stalking, or is more needed?
7. **Fuzz radius 500 m** — is this enough for privacy? What values do Mapbox and others use?
8. **GDPR DPA templates** — are open-source ones available for federated services?
9. **EU PUEB Data Act 2026** — are there new regulations affecting us?
10. **California CCPA/CPRA** — are data portability requirements compatible with the GDPR approach?
11. **PWA/native limitations:** what can realistically be done on iOS/Android/PWA for panic/stealth mode?
12. **Public nearby:** is there a safe version of public nearby, or must this feature stay allowlist-only forever?
