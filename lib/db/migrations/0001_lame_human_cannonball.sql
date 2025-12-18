CREATE TABLE "detected_players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"detected_team_id" uuid,
	"jersey_number" varchar(10),
	"jersey_number_confidence" numeric(3, 2),
	"display_name" varchar(100),
	"position_guess" varchar(50),
	"frames_visible" integer,
	"thumbnail_url" text,
	"tracking_id" varchar(50),
	"embedding" vector(512),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "detected_plays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"play_number" integer,
	"start_timestamp" numeric(10, 2),
	"end_timestamp" numeric(10, 2),
	"formation" varchar(50),
	"play_type" varchar(50),
	"play_direction" varchar(20),
	"yards_gained" integer,
	"down" integer,
	"distance" integer,
	"possession_team_id" uuid,
	"shot_attempted" boolean,
	"shot_made" boolean,
	"shot_type" varchar(50),
	"turnover" boolean,
	"thumbnail_url" text,
	"confidence" numeric(3, 2),
	"raw_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "detected_teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"team_label" varchar(50),
	"primary_jersey_color" varchar(20),
	"secondary_jersey_color" varchar(20),
	"player_count" integer,
	"is_user_team" boolean DEFAULT false,
	"team_name" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"title" varchar(255),
	"description" text,
	"sport" varchar(20),
	"sport_confidence" numeric(3, 2),
	"video_url" text,
	"video_key" text,
	"video_duration_seconds" integer,
	"video_size_bytes" integer,
	"thumbnail_url" text,
	"status" varchar(20) DEFAULT 'uploading' NOT NULL,
	"processing_progress" integer DEFAULT 0,
	"processing_error" text,
	"modal_job_id" varchar(255),
	"game_date" timestamp,
	"opponent" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "key_moments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"detected_player_id" uuid NOT NULL,
	"play_id" uuid,
	"timestamp_seconds" numeric(10, 2),
	"moment_type" varchar(50),
	"sentiment" varchar(20),
	"description" text,
	"thumbnail_url" text,
	"clip_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_analysis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"detected_player_id" uuid NOT NULL,
	"overall_grade" numeric(4, 1),
	"metrics" jsonb,
	"tendencies" jsonb,
	"strengths" jsonb,
	"development_areas" jsonb,
	"summary" text,
	"full_report" text,
	"athleticism_grade" numeric(4, 1),
	"technique_grade" numeric(4, 1),
	"decision_making_grade" numeric(4, 1),
	"consistency_grade" numeric(4, 1),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_play_involvement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"detected_player_id" uuid NOT NULL,
	"play_id" uuid NOT NULL,
	"role" varchar(50),
	"metrics" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_analysis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"detected_team_id" uuid NOT NULL,
	"formation_breakdown" jsonb,
	"play_type_breakdown" jsonb,
	"tendencies" jsonb,
	"tendencies_report" text,
	"offensive_metrics" jsonb,
	"defensive_metrics" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verification_token" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verification_expires" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_reset_token" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_reset_expires" timestamp;--> statement-breakpoint
ALTER TABLE "detected_players" ADD CONSTRAINT "detected_players_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "detected_players" ADD CONSTRAINT "detected_players_detected_team_id_detected_teams_id_fk" FOREIGN KEY ("detected_team_id") REFERENCES "public"."detected_teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "detected_plays" ADD CONSTRAINT "detected_plays_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "detected_plays" ADD CONSTRAINT "detected_plays_possession_team_id_detected_teams_id_fk" FOREIGN KEY ("possession_team_id") REFERENCES "public"."detected_teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "detected_teams" ADD CONSTRAINT "detected_teams_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "key_moments" ADD CONSTRAINT "key_moments_detected_player_id_detected_players_id_fk" FOREIGN KEY ("detected_player_id") REFERENCES "public"."detected_players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "key_moments" ADD CONSTRAINT "key_moments_play_id_detected_plays_id_fk" FOREIGN KEY ("play_id") REFERENCES "public"."detected_plays"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_analysis" ADD CONSTRAINT "player_analysis_detected_player_id_detected_players_id_fk" FOREIGN KEY ("detected_player_id") REFERENCES "public"."detected_players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_play_involvement" ADD CONSTRAINT "player_play_involvement_detected_player_id_detected_players_id_fk" FOREIGN KEY ("detected_player_id") REFERENCES "public"."detected_players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_play_involvement" ADD CONSTRAINT "player_play_involvement_play_id_detected_plays_id_fk" FOREIGN KEY ("play_id") REFERENCES "public"."detected_plays"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_analysis" ADD CONSTRAINT "team_analysis_detected_team_id_detected_teams_id_fk" FOREIGN KEY ("detected_team_id") REFERENCES "public"."detected_teams"("id") ON DELETE cascade ON UPDATE no action;