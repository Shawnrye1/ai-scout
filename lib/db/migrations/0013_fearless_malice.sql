CREATE TABLE "scouting_review_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"detected_player_id" uuid,
	"team" varchar(10) NOT NULL,
	"jersey_number" integer,
	"player_name" varchar(100),
	"scouting_data" jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'pending',
	"reviewed_at" timestamp,
	"reviewed_by" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verified_scouting" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid,
	"detected_player_id" uuid,
	"team" varchar(10) NOT NULL,
	"jersey_number" integer,
	"observation_type" varchar(50) NOT NULL,
	"original_value" text NOT NULL,
	"verified_value" text NOT NULL,
	"was_correction" boolean DEFAULT false,
	"video_timestamp" varchar(20),
	"video_timestamp_seconds" integer,
	"verified_by" varchar(100),
	"quality" varchar(20) DEFAULT 'standard',
	"notes" text,
	"used_in_prompt_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scouting_review_queue" ADD CONSTRAINT "scouting_review_queue_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scouting_review_queue" ADD CONSTRAINT "scouting_review_queue_detected_player_id_detected_players_id_fk" FOREIGN KEY ("detected_player_id") REFERENCES "public"."detected_players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verified_scouting" ADD CONSTRAINT "verified_scouting_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verified_scouting" ADD CONSTRAINT "verified_scouting_detected_player_id_detected_players_id_fk" FOREIGN KEY ("detected_player_id") REFERENCES "public"."detected_players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "scouting_review_game_id_idx" ON "scouting_review_queue" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "scouting_review_status_idx" ON "scouting_review_queue" USING btree ("status");--> statement-breakpoint
CREATE INDEX "verified_scouting_game_id_idx" ON "verified_scouting" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "verified_scouting_type_idx" ON "verified_scouting" USING btree ("observation_type");