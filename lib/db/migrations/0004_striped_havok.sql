ALTER TABLE "games" DROP CONSTRAINT "games_reviewed_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "games" DROP COLUMN "reviewed_at";--> statement-breakpoint
ALTER TABLE "games" DROP COLUMN "reviewed_by";