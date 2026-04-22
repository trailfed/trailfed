---
title: Концепция TrailFed
version: 0.1
status: draft
updated: 2026-04-22
---

# 01. Видение и проблема

## Проблема

Рынок приложений для автономных путешествий фрагментирован. Vanlife, RV, overland, sailing, bike touring, motorcycle travel, trucking и long-term travel используют разные инструменты, хотя у них много общих задач: где остановиться, где заправиться, где взять воду, где безопасно переночевать, где пройти границу, где найти ремонт, интернет и локальную инфраструктуру.

Пользователь сегодня вынужден использовать 5-7 приложений параллельно:

- **Park4Night** (~7M пользователей) — точки для кемперов и RV в Европе, проприетарные данные
- **iOverlander** — overland-точки, CSV-экспорт, но нет API
- **Campendium** (~750k contributors) — кемпинги США, закрытая БД
- **The Dyrt** — subscription-based, кемпинги с reviewами
- **WikiCamps** — только Австралия, закрытая
- **Polarsteps** — трекинг путешествий, не геосоциальный
- **Navily / NoForeignLand / Waterway Guide** — marine/yacht POI, марины и якорные стоянки, но отдельно от road travel
- **Rever / Calimoto / OsmAnd / Komoot** — маршруты для байкеров, велосипедистов и outdoor, но без federation POI слоя
- **Mastodon/Twitter** — общение с другими путешественниками, но нет геоданных

Каждое приложение владеет **своим островом данных**. Пользователь копирует точки вручную между приложениями, дублирует отзывы, не видит полной картины.

## Почему предыдущие попытки унификации провалились

### FreeRoam (2019–2024)
Закрылся в 2024. Причина: чисто краудсорсинговая модель без коммерческой модели, без quality control, без sustainability. Данные плохого качества не могли конкурировать с проприетарными (Campendium). Успешник KampTrail пошёл другим путём — использует verified federal data (RIDB API), отказавшись от crowdsourcing.

### OpenCampingMap (opencampingmap.org)
Существует, активен, но **нишевый**. Проблемы: только read-only consumer OSM, нет user contribution, нет API для сторонних приложений, нет review system. Volunteer-only, не может конкурировать с маркетингом The Dyrt или UX Park4Night.

### Попытки "open camping standard"
Множественные OGC / GTFS-подобные попытки не взлетели. Причины:
1. **Commercial moat** — каждое приложение видит данные как свой конкурентный актив. Отдавать в центральную БД = потерять bargaining power.
2. **Quality control expensive** — moderated contributions требуют платных модераторов. Volunteer модель не масштабируется.
3. **Liability** — компании боятся ответственности за неверные данные (wrong info → accident). Crowdsourced data без verification = риск.
4. **No agreed schema** — каждое приложение использует свою модель данных.

## Инсайт: почему федеративная модель работает там, где централизация провалилась

Модель **Mastodon/ActivityPub** (или аналогично email, Git) решает все четыре проблемы:

| Проблема | Решение в федеративной модели |
|---|---|
| Commercial moat | Каждый instance владеет своими данными, не отдаёт в "central". Шарит ТО что хочет. |
| Quality control | Каждый instance модерирует сам. Бассейн trusted peers → качественный pool. |
| Liability | Данные под подписью конкретного instance/actor. Ответственность на подписавшем. |
| Agreed schema | W3C ActivityPub + AS Vocabulary (Place, Travel, Arrive) уже существуют. |

**Killer pitch для закрытых apps (Park4Night и т.д.):** "Вы не отдаёте данные — вы запускаете свой instance. Шарите публичные POI, не приватные user данные. Получаете федерированные данные от других instances. Exit в любой момент — отключили federation, ничего не сломалось."

Это **positive-sum game** вместо zero-sum "кто владеет базой".

## Видение

**TrailFed — это SMTP для travel POI и social.** Open protocol + reference implementation + web client. Важно: проект начинается не как ещё один centralized travel app, а как открытый federation layer, который могут использовать self-hosters, community apps, tourism boards и existing travel products.

Любой может:

1. Клонировать с GitHub, запустить на своём сервере (10 минут setup)
2. Получить полноценный "POI map + travel social + federation layer" из коробки
3. Федерироваться с trusted instances (POI, posts, check-ins синхронизируются по capability profile)
4. Интегрировать через REST API в любое стороннее приложение (как OSM API)
5. Кастомизировать под свою аудиторию (RV, overland, sailing, bike touring, motorcycle travel, trucking, digital nomads)

## Целевая аудитория

### Primary: Self-hosters + technical travelers
Первые 100-500 пользователей — технические люди которые уже фолловят `r/selfhosted`, `r/fediverse`, знают что такое Mastodon. Они поднимают instance, тестируют, дают feedback.

### Secondary: Community-driven apps
После Phase 2 — разработчики существующих travel приложений. Они видят federation как way to access более широкого pool данных без отдачи контроля.

### Tertiary: End users (travel-in-motion communities)
После Phase 4 — обычные путешественники регистрируются на публичных instances (как регистрируются на mastodon.social). Не обязаны поднимать свой сервер.

Целевые сообщества:

- Van / RV / caravan travelers
- Overlanders
- Sailors and boat owners
- Motorcycle travelers
- Bike tourers
- Digital nomads
- Long-term travelers and backpackers
- Truck drivers and professional road users

### Future: Legacy apps
Park4Night, iOverlander, Campendium — когда 10k+ federated POIs существуют не в их базе, они вынуждены подключиться (или потерять edge).

## Product boundaries после fact-check

Чтобы не превратить проект в "Mastodon + Park4Night + Strava + Find My" одновременно, TrailFed делится на три deliverables:

1. **Protocol/spec** — GeoSocial compatibility profile поверх ActivityPub/ActivityStreams: `Place`, `Arrive`, `Leave`, `Travel`, license metadata, source attribution, quality/confidence.
2. **Reference server** — federation, PostGIS storage, moderation, imports, REST API, admin tools.
3. **Web client** — map-first PWA для просмотра/создания POI, check-ins, reviews и basic social timeline.

Live location sharing остаётся optional/future capability. Она не должна блокировать ранний POI federation MVP и требует отдельного threat model review перед production.

## Non-goals

Что TrailFed **не делает**:
- Не конкурирует с OSM — additive, а не replacement. Мы используем OSM как базу, добавляем слой travel-specific данных, отзывов, confidence и federation metadata.
- Не Airbnb/Booking/Navily для стоянок и марин — не booking platform. Мы indexим точки и публичные сведения, бронирование вне scope.
- Не навигационная система — маршрутизация опциональна (через OSRM), но это не Google Maps killer.
- Не satellite imagery — vector tiles only (Protomaps).
- Не закрытая платформа — AGPL-3, любой форк обязан быть open.
- Не platform для monetization — instances могут быть коммерческими (свой бизнес), но protocol/reference server открытые.
- Не full Mastodon replacement в ранних фазах — совместимость с Mastodon нужна для actors, follows, notes и clients where practical, но `Place`/`Arrive`/`Travel` полноценно работают только с geo-aware peers.
- Не real-time tracking product в v1.0 — live location high-risk, opt-in future feature.

---

## Fact-check questions для агентов

1. Данные о пользователях Park4Night (~7M) — откуда взяты? Актуальны на 2026?
2. FreeRoam закрылся в 2024 точно по причине unsustainable crowdsourcing, или есть другие факторы?
3. KampTrail действительно использует RIDB API и отказался от crowdsourcing?
4. iOverlander реально поощряет контрибьюции в OSM (как мы утверждаем)?
5. Park4Night активно защищает свои данные (есть ли DMCA/legal cases)?
6. W3C ActivityPub/ActivityStreams действительно имеет `Place`, `Travel`, `Arrive`, `Leave` types (первичный fact-check: да, ActivityStreams Vocabulary).
7. Корректно ли описан OpenCampingMap как "read-only consumer OSM"?
8. Существуют ли другие failed attempts к camping standard кроме FreeRoam и OpenCampingMap?
9. Корректна ли формулировка "legacy apps вынуждены подключиться" или лучше заменить на "получат incentive подключиться"?
10. Какой минимальный capability profile нужен, чтобы `Place` federation была полезной без полного social stack?
