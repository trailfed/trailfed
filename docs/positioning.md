---
title: Анализ уникальности TrailFed
version: 0.1
status: draft
updated: 2026-04-22
---

# 02. Уникальность и сравнение с существующими проектами

## TL;DR

Не найден production-ready проект, который объединил бы в одном federated travel product:
1. Social layer (Mastodon-style)
2. POI federation (Places)
3. Privacy-aware check-ins/location metadata
4. Travel tracks (GPX + check-ins)

Live location не считаем обязательным MVP differentiator: это high-risk feature и может появиться только после отдельного safety review. Ближайшие проекты закрывают 1-2 функции. Зелёное поле для TrailFed — именно **travel POI federation + map-first UX + moderation/import tooling**.

## Сравнительная таблица

| Проект | Соц. слой | POI DB | Federated | Live loc. | Travel tracks | Self-host | Стек |
|---|---|---|---|---|---|---|---|
| **Mastodon** | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | Ruby/Rails |
| **GoToSocial** | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | Go |
| **Pleroma/Akkoma** | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | Elixir |
| **Pixelfed** | ✅ (photos) | ❌ | ✅ | ❌ | ❌ | ✅ | PHP/Laravel |
| **Mobilizon** | ✅ (events) | ❌ | ✅ | ❌ | ❌ | ✅ | Elixir |
| **Bonfire** | ✅ | 🟡 (alpha) | ✅ | 🟡 (planned) | ❌ | ✅ | Elixir |
| **Open Pace** | ✅ (fitness) | ❌ | ✅ | ❌ | ✅ (GPX) | ✅ | Ruby |
| **iOverlander** | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | Proprietary |
| **Park4Night** | 🟡 (light) | ✅ | ❌ | ❌ | ❌ | ❌ | Proprietary |
| **Campendium** | 🟡 (reviews) | ✅ | ❌ | ❌ | ❌ | ❌ | Proprietary |
| **The Dyrt** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | Proprietary |
| **Polarsteps** | 🟡 (light) | ❌ | ❌ | ✅ (friends) | ✅ | ❌ | Proprietary |
| **OpenCampingMap** | ❌ | ✅ (OSM ro) | ❌ | ❌ | ❌ | ✅ | Python |
| **places.pub** | ❌ | ✅ | ✅ | ❌ | ❌ | 🟡 | TypeScript |
| **TrailFed (план)** | ✅ | ✅ | ✅ | 🟡 (future, opt-in) | ✅ | ✅ | Go или TS/Fedify |

## Детальный разбор близких по концепции проектов

### Bonfire ([bonfirenetworks.org](https://bonfirenetworks.org))
**Статус:** активно разрабатывается, alpha stage. Экспериментируют с geosocial extension.

**Что делают:** модульный Fediverse framework на Elixir. Обещают "location-based activities, check-ins, maps, places.pub integration" — но это pre-release, нет production deployment.

**Почему не конкурент:**
- Slow moving (low release cadence)
- General-purpose framework, не travel-focused
- Нет live location sharing в roadmap
- Elixir — специфический язык с малым developer pool

**Potential collaboration:** cross-federation возможна (оба ActivityPub-compatible).

### Open Pace ([open-pace.com](https://www.open-pace.com/))
**Статус:** production-ready, niche (sport/fitness).

**Что делают:** federated Strava — пользователи публикуют беговые/велосипедные активности, GPX tracks, получают лайки и комменты через ActivityPub.

**Почему не конкурент:**
- Sport-focused, не travel infrastructure — нет POI federation, стоянок, марин, сервисов, границ, fuel/water/repair context
- Активности — короткие (run/ride), не long-term travel stories
- Нет live location (только post-hoc upload)

**Что мы заимствуем:** архитектуру GPX → ActivityPub Activity mapping.

### Mobilizon ([joinmobilizon.org](https://joinmobilizon.org))
**Статус:** production, поддерживается Framasoft.

**Что делают:** federated events platform. "ActivityPub для мероприятий". Карта events, geo-search.

**Почему не конкурент:**
- Events, не POI. Event — временное (от до даты), POI — постоянное.
- Нет check-ins, live location, travel tracks
- Нет social posts кроме events

**Что мы заимствуем:** их подход к geosearch и `Event` object федерации.

### places.pub ([places.pub](https://places.pub/), [GitHub](https://github.com/social-web-foundation/places.pub))
**Статус:** active/experimental, разработан Social Web Foundation.

**Что делают:** публикация OSM данных как ActivityStreams/ActivityPub-compatible `Place` objects. URL schema: `https://places.pub/{node|way|relation}/{id}`. Объекты не являются ActivityPub Actors: нет inbox/outbox, их нельзя follow как server peer.

**Почему не конкурент:** **Это complementary проект.** Они — POI data provider. Мы — consumer + extender (добавляем reviews, check-ins, quality tiers).

**Planned collaboration:** TrailFed использует places.pub как canonical AS2 Place reference/lookup. Это не полноценная двусторонняя federation: мы fetch/read их объекты, но не отправляем им activities.

### GoToSocial ([gotosocial.org](https://gotosocial.org))
**Статус:** beta (Sept 2024 вышел из alpha). Активно развивается.

**Что делают:** lightweight Mastodon alternative в Go. Single binary, minimal deps.

**Почему не конкурент:** они — general-purpose ActivityPub server. Мы — travel-specific с POI, check-ins, live location.

**Что мы заимствуем:** архитектурные принципы (single binary, low RAM, AGPL license), Mastodon-API compat layer.

## Что уже НЕ существует (проверено)

После первичного research на 2026-04-22 не найдено:
- Federated POI database для travelers с review system
- "Mastodon для путешественников" с картой как первым интерфейсом
- Turnkey self-host решения для geo-social (Mobilizon самое близкое, но events only)
- Production-ready ActivityPub check-in/POI server с moderation/import tooling

## ATProto / Bluesky

Проверено: на 2026-04-22 нет ATProto-based travel/geo-social проекта. Bluesky AT Protocol — альтернативная federation architecture (PDS-модель). Теоретически можно было бы построить на нём, но:
- ATProto менее зрелый чем ActivityPub
- Меньше existing clients
- Нет Place/Travel primitives в AT Lexicons

Решение: идём с ActivityPub. Будущая совместимость с ATProto — через bridge (проекты типа bridgy.fed уже существуют).

## Позиционирование в W3C экосистеме

**W3C Social Web Community Group** имеет active workgroup `swicg/geosocial` ([github.com/swicg/geosocial](https://github.com/swicg/geosocial)) — draft геосоциального расширения для ActivityPub. Pre-1.0, не adopted широко.

**Наша стратегия:** TrailFed = одна из первых production-oriented implementations geosocial patterns. Не утверждаем "reference implementation" без согласования с Social Web CG/SWF. Это даёт:
- Standardization momentum (мы driver, не follower)
- Credibility через reuse W3C vocabulary и участие в SWICG/GeoSocial
- Cross-compat с будущими implementations

## Что пропустили? (открытые вопросы)

- Japanese Fediverse может иметь локальные travel-специфичные проекты — не проверялось детально
- Китайский/корейский рынок federation закрыт (WeChat), но могут быть open projects
- Academic projects на federated POI (DecKG, federated recommendation systems) — существуют, но не production

---

## Fact-check questions для агентов

1. **Bonfire статус:** проверить их GitHub repos (все: bonfire-networks/bonfire-app, bonfire-social и др.) — какой stage? Production или alpha?
2. **Open Pace:** их последний коммит в GitHub (myfear/open-pace)? Активен?
3. **places.pub:** проверить их current API — действительно ли они публикуют OSM как Place objects? Сколько POIs?
4. **GoToSocial:** подтвердить что вышли из alpha в 2024. Какой сейчас статус?
5. **Mobilizon:** проверить есть ли у них встроенное "check-in" для events?
6. **iOverlander:** проверить их FAQ/API docs — они точно поощряют OSM contribution?
7. **swicg/geosocial:** активен ли workgroup? Последний коммит?
8. **Pixelfed:** они добавили geotagging в posts (issue на GitHub)?
9. **Misskey / Sharkey:** не пропустили ли мы эти форки Mastodon? Есть ли travel-специфичные форки?
10. **ATProto:** есть ли известные AT Protocol travel/geo apps в разработке?
11. **Japanese Fediverse:** существуют ли локальные travel-specific Fediverse проекты (проверить через fediverse-observer, fediverse.info)?
12. **Academic:** есть ли open-source академические проекты в federated POI (проверить arxiv.org)?
13. **checkin.swf.pub:** проверить статус geosocial check-in client Social Web Foundation и уроки для TrailFed.
