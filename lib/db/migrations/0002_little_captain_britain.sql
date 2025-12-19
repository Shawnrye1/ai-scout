CREATE TABLE "corrections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"play_id" uuid,
	"game_id" uuid,
	"original_data" jsonb,
	"corrected_data" jsonb,
	"corrected_by" varchar(100),
	"correction_type" varchar(50),
	"notes" text,
	"used_for_training" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "detected_plays" ADD COLUMN "start_time" integer;--> statement-breakpoint
ALTER TABLE "detected_plays" ADD COLUMN "end_time" integer;--> statement-breakpoint
ALTER TABLE "detected_plays" ADD COLUMN "needs_review" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "detected_plays" ADD COLUMN "flag_reason" text;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "name" varchar(255);--> statement-breakpoint
ALTER TABLE "corrections" ADD CONSTRAINT "corrections_play_id_detected_plays_id_fk" FOREIGN KEY ("play_id") REFERENCES "public"."detected_plays"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corrections" ADD CONSTRAINT "corrections_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;