CREATE TABLE "sports_team_players" (
	"id" serial PRIMARY KEY NOT NULL,
	"sports_team_id" integer NOT NULL,
	"jersey_number" integer NOT NULL,
	"name" varchar(100),
	"height" varchar(10),
	"weight" integer,
	"position" varchar(30),
	"year_grade" varchar(20),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sports_teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"sport" varchar(20) NOT NULL,
	"jersey_color_home" varchar(50),
	"jersey_color_away" varchar(50),
	"city" varchar(100),
	"state" varchar(50),
	"conference" varchar(100),
	"division" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "opponent_sports_team_id" integer;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "is_home_game" boolean;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "sports_team_id" integer;--> statement-breakpoint
ALTER TABLE "sports_team_players" ADD CONSTRAINT "sports_team_players_sports_team_id_sports_teams_id_fk" FOREIGN KEY ("sports_team_id") REFERENCES "public"."sports_teams"("id") ON DELETE no action ON UPDATE no action;