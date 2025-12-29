CREATE TABLE "prompt_suggestions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_type" varchar(50) NOT NULL,
	"suggestion_type" varchar(50) NOT NULL,
	"priority" varchar(20) DEFAULT 'medium',
	"title" varchar(200) NOT NULL,
	"description" text NOT NULL,
	"suggested_change" text,
	"based_on_rejections" integer DEFAULT 0,
	"rejection_reasons" jsonb,
	"status" varchar(20) DEFAULT 'pending',
	"implemented_in_version" varchar(20),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"reviewed_at" timestamp,
	"reviewed_by" varchar(100)
);
--> statement-breakpoint
CREATE TABLE "prompt_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_type" varchar(50) NOT NULL,
	"version" varchar(20) NOT NULL,
	"prompt_hash" varchar(64) NOT NULL,
	"prompt_summary" text,
	"change_reason" text,
	"few_shot_enabled" boolean DEFAULT false,
	"few_shot_count" integer DEFAULT 0,
	"games_analyzed" integer DEFAULT 0,
	"events_detected" integer DEFAULT 0,
	"events_verified" integer DEFAULT 0,
	"events_rejected" integer DEFAULT 0,
	"accuracy_rate" numeric(5, 2),
	"is_active" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"activated_at" timestamp,
	"deactivated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "verified_examples" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid,
	"event_type" varchar(50) NOT NULL,
	"team" varchar(10) NOT NULL,
	"jersey_number" integer,
	"timestamp" varchar(20) NOT NULL,
	"timestamp_seconds" integer,
	"description" text NOT NULL,
	"raw_event_data" jsonb,
	"verified_by" varchar(100),
	"quality" varchar(20) DEFAULT 'standard',
	"used_in_prompt_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "verified_examples" ADD CONSTRAINT "verified_examples_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;