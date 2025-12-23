CREATE TABLE "model_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"training_run_id" uuid NOT NULL,
	"model_type" varchar(50) NOT NULL,
	"version" varchar(20),
	"accuracy" numeric(5, 2),
	"precision" numeric(5, 2),
	"recall" numeric(5, 2),
	"f1_score" numeric(5, 2),
	"map50" numeric(5, 2),
	"map50_95" numeric(5, 2),
	"training_loss" numeric(10, 6),
	"validation_loss" numeric(10, 6),
	"model_path" text,
	"model_size_bytes" integer,
	"inference_time_ms" integer,
	"is_production" boolean DEFAULT false,
	"deployed_at" timestamp,
	"class_metrics" jsonb,
	"confusion_matrix" jsonb,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_type" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'queued' NOT NULL,
	"modal_job_id" varchar(255),
	"training_data_count" integer,
	"epochs" integer DEFAULT 50,
	"batch_size" integer DEFAULT 16,
	"base_model" varchar(100) DEFAULT 'yolov8m.pt',
	"started_at" timestamp,
	"completed_at" timestamp,
	"duration_seconds" integer,
	"error_message" text,
	"training_config" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "model_metrics" ADD CONSTRAINT "model_metrics_training_run_id_training_runs_id_fk" FOREIGN KEY ("training_run_id") REFERENCES "public"."training_runs"("id") ON DELETE cascade ON UPDATE no action;