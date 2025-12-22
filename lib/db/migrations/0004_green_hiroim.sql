ALTER TABLE "games" ADD COLUMN "annotation_status" varchar(20) DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "reviewed_at" timestamp;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "reviewed_by" integer;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;