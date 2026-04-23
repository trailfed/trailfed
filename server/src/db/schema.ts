// SPDX-License-Identifier: AGPL-3.0-or-later

// Drizzle schema for TrailFed. Source of truth: docs/architecture/overview.md.
// Geography columns use a customType that maps to PostGIS `geography(Point, 4326)`;
// Drizzle has no first-class PostGIS type yet, so values cross the boundary as
// WKT strings (e.g. "SRID=4326;POINT(lon lat)") or GeoJSON feeding ST_GeomFromGeoJSON.

import { sql } from 'drizzle-orm';
import {
  bigint,
  bigserial,
  boolean,
  customType,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

// PostGIS geography(Point, 4326). We don't round-trip the value in TS (kept as
// string/unknown); DDL emission is what matters for the initial migration.
export const geographyPoint = customType<{ data: string; driverData: string }>({
  dataType() {
    return 'geography(Point, 4326)';
  },
});

export const actors = pgTable(
  'actors',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    uri: text('uri').notNull().unique(),
    username: varchar('username', { length: 64 }).notNull(),
    domain: varchar('domain', { length: 255 }).notNull(),
    displayName: varchar('display_name', { length: 200 }),
    bio: text('bio'),
    avatarUrl: text('avatar_url'),
    publicKey: text('public_key'),
    privateKey: text('private_key'),
    passwordHash: text('password_hash'),
    isLocal: boolean('is_local').default(false),
    followersUrl: text('followers_url'),
    followingUrl: text('following_url'),
    inboxUrl: text('inbox_url'),
    outboxUrl: text('outbox_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
  },
  (t) => ({
    usernameDomainUq: uniqueIndex('actors_username_domain_uq').on(t.username, t.domain),
  }),
);

export const places = pgTable(
  'places',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    uri: text('uri').notNull().unique(),
    localUuid: uuid('local_uuid')
      .notNull()
      .unique()
      .default(sql`uuid_generate_v4()`),
    originActorId: bigint('origin_actor_id', { mode: 'bigint' }).references(() => actors.id),

    category: varchar('category', { length: 50 }).notNull(),
    names: jsonb('names').notNull(),
    geom: geographyPoint('geom').notNull(),

    amenities: jsonb('amenities'),
    accessInfo: jsonb('access_info'),
    qualityTier: smallint('quality_tier').default(0),
    reviewsCount: integer('reviews_count').default(0),
    reviewsAvg: numeric('reviews_avg', { precision: 3, scale: 2 }),

    osmId: bigint('osm_id', { mode: 'bigint' }),
    osmType: varchar('osm_type', { length: 10 }),
    osmTags: jsonb('osm_tags'),

    sourceType: varchar('source_type', { length: 30 }).default('user'),
    sourceLicense: varchar('source_license', { length: 50 }),
    sourceConfidence: smallint('source_confidence').default(0),
    attribution: text('attribution'),

    originInstance: varchar('origin_instance', { length: 255 }),
    signatures: jsonb('signatures'),

    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
  },
  (t) => ({
    geomIdx: index('places_geom_idx').using('gist', t.geom),
    categoryIdx: index('places_category_idx')
      .on(t.category)
      .where(sql`${t.isActive}`),
    osmIdIdx: index('places_osm_id_idx')
      .on(t.osmId)
      .where(sql`${t.osmId} IS NOT NULL`),
  }),
);

export const placeSources = pgTable(
  'place_sources',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    placeId: bigint('place_id', { mode: 'bigint' }).references(() => places.id),
    sourceType: varchar('source_type', { length: 30 }).notNull(),
    sourceUri: text('source_uri'),
    license: varchar('license', { length: 50 }),
    attribution: text('attribution'),
    fields: jsonb('fields').notNull(),
    importedAt: timestamp('imported_at', { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    placeIdx: index('place_sources_place_idx').on(t.placeId),
  }),
);

export const activities = pgTable(
  'activities',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    uri: text('uri').notNull().unique(),
    type: varchar('type', { length: 50 }).notNull(),
    actorId: bigint('actor_id', { mode: 'bigint' }).references(() => actors.id),
    objectUri: text('object_uri'),
    objectType: varchar('object_type', { length: 50 }),
    targetUri: text('target_uri'),
    data: jsonb('data').notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true }).notNull(),
    signature: text('signature'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    actorTypeIdx: index('activities_actor_type_idx').on(t.actorId, t.type),
  }),
);

// Forward-declare notes for the self-referencing FK.
export const notes = pgTable(
  'notes',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    uri: text('uri').notNull().unique(),
    actorId: bigint('actor_id', { mode: 'bigint' }).references(() => actors.id),
    content: text('content'),
    contentWarning: text('content_warning'),
    language: varchar('language', { length: 5 }),
    inReplyToId: bigint('in_reply_to_id', { mode: 'bigint' }).references((): any => notes.id),
    location: geographyPoint('location'),
    placeId: bigint('place_id', { mode: 'bigint' }).references(() => places.id),
    visibility: varchar('visibility', { length: 20 }),
    publishedAt: timestamp('published_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    actorIdx: index('notes_actor_idx').on(t.actorId),
    placeIdx: index('notes_place_idx')
      .on(t.placeId)
      .where(sql`${t.placeId} IS NOT NULL`),
    locationIdx: index('notes_location_idx')
      .using('gist', t.location)
      .where(sql`${t.location} IS NOT NULL`),
  }),
);

export const checkins = pgTable(
  'checkins',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    actorId: bigint('actor_id', { mode: 'bigint' }).references(() => actors.id),
    placeId: bigint('place_id', { mode: 'bigint' }).references(() => places.id),
    activityId: bigint('activity_id', { mode: 'bigint' }).references(() => activities.id),
    arrivedAt: timestamp('arrived_at', { withTimezone: true }).notNull(),
    leftAt: timestamp('left_at', { withTimezone: true }),
    noteId: bigint('note_id', { mode: 'bigint' }).references(() => notes.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    placeIdx: index('checkins_place_idx').on(t.placeId, t.arrivedAt),
  }),
);

export const follows = pgTable(
  'follows',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    actorId: bigint('actor_id', { mode: 'bigint' }).references(() => actors.id),
    targetActorId: bigint('target_actor_id', { mode: 'bigint' }).references(() => actors.id),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    actorTargetUq: uniqueIndex('follows_actor_target_uq').on(t.actorId, t.targetActorId),
  }),
);

export const peers = pgTable('peers', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  domain: varchar('domain', { length: 255 }).notNull().unique(),
  softwareName: varchar('software_name', { length: 100 }),
  softwareVersion: varchar('software_version', { length: 100 }),
  inboxUrl: text('inbox_url'),
  publicKey: text('public_key'),
  trustLevel: varchar('trust_level', { length: 20 }).default('graylist'),
  reputationScore: integer('reputation_score').default(0),
  lastFetchedAt: timestamp('last_fetched_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const liveLocations = pgTable(
  'live_locations',
  {
    actorId: bigint('actor_id', { mode: 'bigint' })
      .primaryKey()
      .references(() => actors.id),
    geom: geographyPoint('geom').notNull(),
    precisionTier: varchar('precision_tier', { length: 20 }).notNull(),
    accuracyM: integer('accuracy_m'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    geomIdx: index('live_locations_geom_idx').using('gist', t.geom),
  }),
);
