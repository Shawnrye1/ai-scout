ALTER TABLE "training_runs" ADD COLUMN "progress" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "training_runs" ADD COLUMN "current_epoch" integer DEFAULT 0;