CREATE TABLE "activities" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"uri" text NOT NULL,
	"type" varchar(50) NOT NULL,
	"actor_id" bigint,
	"object_uri" text,
	"object_type" varchar(50),
	"target_uri" text,
	"data" jsonb NOT NULL,
	"published_at" timestamp with time zone NOT NULL,
	"signature" text,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "activities_uri_unique" UNIQUE("uri")
);
--> statement-breakpoint
CREATE TABLE "actors" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"uri" text NOT NULL,
	"username" varchar(64) NOT NULL,
	"domain" varchar(255) NOT NULL,
	"display_name" varchar(200),
	"bio" text,
	"avatar_url" text,
	"public_key" text,
	"private_key" text,
	"is_local" boolean DEFAULT false,
	"followers_url" text,
	"following_url" text,
	"inbox_url" text,
	"outbox_url" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone,
	CONSTRAINT "actors_uri_unique" UNIQUE("uri")
);
--> statement-breakpoint
CREATE TABLE "checkins" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"actor_id" bigint,
	"place_id" bigint,
	"activity_id" bigint,
	"arrived_at" timestamp with time zone NOT NULL,
	"left_at" timestamp with time zone,
	"note_id" bigint,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "follows" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"actor_id" bigint,
	"target_actor_id" bigint,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "live_locations" (
	"actor_id" bigint PRIMARY KEY NOT NULL,
	"geom" geography(Point, 4326) NOT NULL,
	"precision_tier" varchar(20) NOT NULL,
	"accuracy_m" integer,
	"expires_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"uri" text NOT NULL,
	"actor_id" bigint,
	"content" text,
	"content_warning" text,
	"language" varchar(5),
	"in_reply_to_id" bigint,
	"location" geography(Point, 4326),
	"place_id" bigint,
	"visibility" varchar(20),
	"published_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "notes_uri_unique" UNIQUE("uri")
);
--> statement-breakpoint
CREATE TABLE "peers" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"domain" varchar(255) NOT NULL,
	"software_name" varchar(100),
	"software_version" varchar(100),
	"inbox_url" text,
	"public_key" text,
	"trust_level" varchar(20) DEFAULT 'graylist',
	"reputation_score" integer DEFAULT 0,
	"last_fetched_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "peers_domain_unique" UNIQUE("domain")
);
--> statement-breakpoint
CREATE TABLE "place_sources" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"place_id" bigint,
	"source_type" varchar(30) NOT NULL,
	"source_uri" text,
	"license" varchar(50),
	"attribution" text,
	"fields" jsonb NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "places" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"uri" text NOT NULL,
	"local_uuid" uuid DEFAULT uuid_generate_v4() NOT NULL,
	"origin_actor_id" bigint,
	"category" varchar(50) NOT NULL,
	"names" jsonb NOT NULL,
	"geom" geography(Point, 4326) NOT NULL,
	"amenities" jsonb,
	"access_info" jsonb,
	"quality_tier" smallint DEFAULT 0,
	"reviews_count" integer DEFAULT 0,
	"reviews_avg" numeric(3, 2),
	"osm_id" bigint,
	"osm_type" varchar(10),
	"osm_tags" jsonb,
	"source_type" varchar(30) DEFAULT 'user',
	"source_license" varchar(50),
	"source_confidence" smallint DEFAULT 0,
	"attribution" text,
	"origin_instance" varchar(255),
	"signatures" jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone,
	CONSTRAINT "places_uri_unique" UNIQUE("uri"),
	CONSTRAINT "places_local_uuid_unique" UNIQUE("local_uuid")
);
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_actor_id_actors_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."actors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_actor_id_actors_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."actors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_actor_id_actors_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."actors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_target_actor_id_actors_id_fk" FOREIGN KEY ("target_actor_id") REFERENCES "public"."actors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_locations" ADD CONSTRAINT "live_locations_actor_id_actors_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."actors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_actor_id_actors_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."actors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_in_reply_to_id_notes_id_fk" FOREIGN KEY ("in_reply_to_id") REFERENCES "public"."notes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "place_sources" ADD CONSTRAINT "place_sources_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "places" ADD CONSTRAINT "places_origin_actor_id_actors_id_fk" FOREIGN KEY ("origin_actor_id") REFERENCES "public"."actors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activities_actor_type_idx" ON "activities" USING btree ("actor_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX "actors_username_domain_uq" ON "actors" USING btree ("username","domain");--> statement-breakpoint
CREATE INDEX "checkins_place_idx" ON "checkins" USING btree ("place_id","arrived_at");--> statement-breakpoint
CREATE UNIQUE INDEX "follows_actor_target_uq" ON "follows" USING btree ("actor_id","target_actor_id");--> statement-breakpoint
CREATE INDEX "live_locations_geom_idx" ON "live_locations" USING gist ("geom");--> statement-breakpoint
CREATE INDEX "notes_actor_idx" ON "notes" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "notes_place_idx" ON "notes" USING btree ("place_id") WHERE "notes"."place_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "notes_location_idx" ON "notes" USING gist ("location") WHERE "notes"."location" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "place_sources_place_idx" ON "place_sources" USING btree ("place_id");--> statement-breakpoint
CREATE INDEX "places_geom_idx" ON "places" USING gist ("geom");--> statement-breakpoint
CREATE INDEX "places_category_idx" ON "places" USING btree ("category") WHERE "places"."is_active";--> statement-breakpoint
CREATE INDEX "places_osm_id_idx" ON "places" USING btree ("osm_id") WHERE "places"."osm_id" IS NOT NULL;