---
title: OpenStreetMap интеграция
version: 0.1
status: draft
updated: 2026-04-22
---

# 07. OSM Integration

## Философия: additive, не replacement

TrailFed **не заменяет** OpenStreetMap. OSM — источник истины для постоянных географических объектов (дороги, кемпинги, заправки). TrailFed добавляет слой который OSM не покрывает и не должен покрывать:

- Review и ratings (OSM не хранит "этот кемпинг хороший")
- Ephemeral data (сезонность, временные закрытия)
- Van-specific опции (height limit, van-friendly amenities)
- Free camping spots (OSM не картирует illegal/grey zones в некоторых странах)
- Social layer (кто недавно был, треки)

Модель — как iOverlander: OSM для базы, своя надстройка для specialty.

## Три аспекта интеграции

### 1. Tiles (vector tiles через Protomaps)

#### Источник
[Protomaps Basemaps](https://protomaps.com/) — project строящий vector tiles из OSM data, published как PMTiles формат.

#### Workflow
1. Для production/global operators: скачать current full planet PMTiles build (порядка 120 GB для z0-z15 на 2026)
2. Для default self-host: сделать regional extract или reduced maxzoom tileset через `pmtiles extract`
3. Разворачиваем на локальном сервере или S3
4. MapLibre GL JS читает через HTTP range requests через `pmtiles` protocol plugin

#### Обновления
- Protomaps rebuilds tiles ~monthly
- Мы pulling их обновления в cron
- Можем strobing hot-reload: newer PMTiles file доступен, клиенты подтянут

#### Альтернативы (на случай если Protomaps не подойдёт)
- **OpenMapTiles** — classic tileserver, требует PostgreSQL + pg_tileserv
- **Tilemaker** — build own PMTiles из OSM extracts
- **OSMF tile servers** — публичные, но fair use limits (no heavy traffic)

### 2. POI Import (PBF extracts first, Overpass only for small queries)

#### Что импортируем
OSM tags mapped на наши categories:

| OSM tag | TrailFed category |
|---|---|
| `tourism=camp_site` | `campsite` |
| `tourism=caravan_site` | `caravan_site` |
| `amenity=camping` (на naturals) | `free_camping` |
| `amenity=drinking_water` | `drinking_water` |
| `amenity=toilets` | `toilets` |
| `amenity=shower` | `shower` |
| `amenity=fuel` | `fuel` |
| `amenity=sanitary_dump_station` | `dump_station` |
| `amenity=parking` + `motorhome=yes` | `overnight_parking` |
| `internet_access=wifi` | `wifi_spot` (если публичный) |

#### Pipeline для initial seed

Для initial import страны/региона не используем public Overpass как bulk backend. Правильный путь:

1. Скачать `.osm.pbf` extract из Geofabrik или другого OSM mirror.
2. Отфильтровать relevant tags через `osmium tags-filter` или импортировать в PostGIS/osm2pgsql.
3. Map OSM elements в TrailFed `Place`.
4. Сохранить source/license/attribution в `place_sources`.

Overpass остаётся полезен для small bbox queries, admin preview, delta checks и developer testing.

```go
// pseudocode
func ImportOsmRegion(bbox Bbox) {
    elements := loadFilteredPbfExtract(region, categories)
    for _, element := range elements {
        place := mapOsmToPlace(element)
        existing := findByOsmId(element.id)
        if existing == nil {
            insertPlace(place)
            federateCreate(place)
        } else if hasChanges(existing, place) {
            updatePlace(existing.id, place)
            federateUpdate(place)
        }
    }
}
```

#### Overpass fair use
- Public Overpass подходит для small/interactive queries, не для массового импорта страны/континента
- Main overpass-api.de safe-use guideline: <10,000 queries/day и <1 GB/day download
- Sleep 1-5 seconds between queries
- Respect `429 Too Many Requests`
- Не полагаться на endpoint rotation как production strategy; некоторые public instances меняют статус. На 2026 `overpass.kumi.systems` переехал/известен как Private.coffee, `maps.mail.ru` в OSM wiki отмечался как temporarily suspended from 2026-03-16.

#### Initial seed vs periodic sync
- **Initial seed** (one-time, при установке instance):
  - Admin выбирает регионы (страны или custom bbox) в config
  - Full import, ~minutes to hours depending on scale
- **Periodic sync** (cron, every 1-7 days):
  - Same regions, but updated_at > last_sync filter
  - Update только changed places
  - OSM typically changes 0.1-1% per day

### 3. Back-contribution (контрибьют в OSM) — optional, Phase 4+

#### Концепция
Когда пользователь замечает что POI в OSM неточный (wrong name, missing amenity), предлагаем option: "Contribute this fix to OSM".

#### Как это работает
1. Пользователь авторизуется в OSM через OAuth 2.0 (https://www.openstreetmap.org/oauth2)
2. TrailFed получает temporary token
3. Пользователь редактирует POI в TrailFed UI
4. Submit → two-way:
   - Update в TrailFed database (instant)
   - Submit changeset to OSM API через user's token (takes 1-5 seconds)

#### Что НЕ контрибьютим back
- Van-specific amenities (OSM community может счесть out of scope)
- Free camping spots (может нарушать local laws, OSM тщательно проверяет legal)
- Review text (OSM не хранит subjective data)
- Ephemeral data (сезонные опции)

Всё что приведёт к конфликту с OSM community — остаётся только в TrailFed layer.

#### OSM attribution

Все импортированные POIs должны содержать attribution:

```json
{
  "type": "Place",
  "id": "https://instance.com/places/uuid",
  "trailfed:osm_id": 123456,
  "trailfed:osm_type": "node",
  "attribution": "© OpenStreetMap contributors, ODbL 1.0"
}
```

## Geocoding (Nominatim)

### Опции для self-host

**Option 1: No geocoding** (по умолчанию для micro-instances)
- User сам вводит координаты через map picker
- Никакой server-side infrastructure

**Option 2: Regional Nominatim**
- Download country extract from Geofabrik
- Setup Nominatim для this region
- Country scale: 1-5 GB disk, 4-8 GB RAM
- Example: Portugal = ~300 MB extract, reasonable

**Option 3: Full planet Nominatim**
- Full OSM planet import
- На 2026: около **1 TB disk**, **128 GB RAM strongly recommended**; меньше 64 GB RAM maintainers прямо не рекомендуют
- Overkill для большинства instances
- Only для large operators

**Option 4: Public Nominatim proxy**
- Prox requests to `nominatim.openstreetmap.org`
- Fair use: ≤1 req/sec, proper User-Agent
- Cache responses aggressively
- Suitable для low-traffic instances

Мы рекомендуем **Option 1 или 4** для defaults. Option 2 advanced. Option 3 enterprise.

### API wrapping

TrailFed предоставляет унифицированный endpoint:

```
GET /api/v1/geocode?q=Porto, Portugal
  → internally routes to configured Nominatim backend
  → returns GeoJSON FeatureCollection

GET /api/v1/geocode/reverse?lat=...&lng=...
  → same
```

## Routing (OSRM)

### Что и почему
OSRM = Open Source Routing Machine. Self-hostable routing engine использующий OSM data.

### Config opt-in
Default в docker-compose: **off** (требует отдельной compute).

Admin может включить:
- Download OSRM extract для region (например, Europe = 20 GB)
- Run OSRM container
- TrailFed routes requests `/api/v1/directions` → OSRM

### Альтернативы
- **Valhalla** — более mature, сложнее setup
- **GraphHopper** — Java-based, нравится enterprise
- **OSM.org / OSRM public API** — fair use limits

## ODbL compliance

OpenStreetMap data лицензирована под [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/).

Требования для нас:
1. **Attribution** — каждый импортированный POI должен указывать OSM source
2. **Share-Alike** — наша derived data тоже open (мы используем ODbL для TrailFed POI data)
3. **Keep Open** — если модифицируем OSM data, derivatives тоже open

Мы соответствуем:
- ✅ Attribution в metadata каждого Place
- ✅ Our data published under ODbL through API exports
- ✅ We don't lock derivative data behind proprietary formats

### Правовая сторона back-contribution

Когда пользователь контрибьютит edit в OSM:
- Changeset создаётся под **его** аккаунтом (user's OAuth token)
- Все edits принадлежат OSM community
- Мы не имеем ownership over contributed data
- Важно: Attribution `created_by=trailfed` в changeset tags для analytics

## Community relations (OSM)

### Риски
- OSM community может воспринять нас как "leeching" (только consume, не contribute)
- Не-OSM-compatible данные (free camping) могут создать conflict

### Mitigation
1. **Public dev blog** — регулярно писать OSM diary posts: "we're building X using OSM"
2. **Upstream bugs** — репортить OSM data issues которые находим при импорте
3. **Commit back to OSM** via user contributions (Phase 4+)
4. **Conference presence** — State of the Map, OSM conferences
5. **No bulk uploads без community approval** — никогда не shoveling данных в OSM

## iOverlander precedent

iOverlander успешно co-exists с OSM: они импортируют OSM POIs, добавляют свой слой (reviews), и поощряют пользователей контрибьютить обратно. Мы следуем их модели.

Links:
- [iOverlander OSM integration](https://ioverlander.com/osm)
- iOverlander community обсуждение — no friction с OSM

---

## Fact-check questions для агентов

1. **Protomaps planet PMTiles** — точный URL для current builds? Актуальный размер full planet и regional extracts?
2. **Nominatim full planet** — точные системные требования для актуальной версии (5.x или новее).
3. **Overpass API** — rate limits официально задокументированы?
4. **Overpass endpoints** — какие публичные еще работают в 2026, и какие официальные usage policies у каждого?
5. **Geofabrik extracts** — размер Portugal extract примерно 300 MB — верно?
6. **OSRM** — минимальные требования для Europe region?
7. **OSM OAuth 2.0** — endpoint и flow correct?
8. **ODbL 1.0** — текущая версия лицензии? Требования attribution?
9. **iOverlander-OSM integration** — actually how they do it? Документированы ли their practices?
10. **OSM changeset tags** — `created_by` convention правильная?
11. **PBF pipeline:** osmium/osm2pgsql/tilemaker — какой минимальный importer быстрее реализовать для TrailFed MVP?
12. **ODbL boundary:** как правильно отделить OSM-derived database от user reviews/check-ins и non-ODbL content?
