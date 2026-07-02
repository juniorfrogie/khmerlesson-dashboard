-- Create debug_logs table: end-to-end trace log shared by server and mobile client.
-- Rows are keyed by trace_id, the same value carried in the X-Correlation-ID
-- header (server/auth/middleware/correlation.ts), so a single id can be
-- queried to reconstruct what happened across both sides of a request.
CREATE TABLE IF NOT EXISTS "debug_logs" (
    "id" serial PRIMARY KEY NOT NULL,
    "trace_id" varchar(100) NOT NULL,
    "source" varchar(20) NOT NULL,
    "level" varchar(10) DEFAULT 'info' NOT NULL,
    "message" text NOT NULL,
    "context" jsonb,
    "user_id" integer,
    "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

DO $$ BEGIN
    ALTER TABLE "debug_logs" ADD CONSTRAINT "debug_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "debug_logs_trace_id_idx" ON "debug_logs" ("trace_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "debug_logs_created_at_idx" ON "debug_logs" ("created_at");
