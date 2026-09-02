-- Cloud progress tables — account-scoped quiz scores and lesson completion,
-- replacing what the mobile app previously kept device-local only.
-- Hand-authored to match this repo's existing migration style (no DATABASE_URL
-- was available to run `drizzle-kit generate` when this was written — see
-- shared/schema.ts for the source-of-truth table definitions this mirrors).

CREATE TABLE IF NOT EXISTS "quiz_attempts" (
    "id" serial PRIMARY KEY NOT NULL,
    "user_id" integer NOT NULL,
    "lesson_id" integer NOT NULL,
    "quiz_id" integer NOT NULL,
    "score" integer NOT NULL,
    "total" integer NOT NULL,
    "completed_at" timestamp NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "quiz_attempts_user_quiz_unique" UNIQUE("user_id","quiz_id")
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "lesson_completions" (
    "id" serial PRIMARY KEY NOT NULL,
    "user_id" integer NOT NULL,
    "main_lesson_id" integer NOT NULL,
    "lesson_id" integer NOT NULL,
    "completed_at" timestamp NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "lesson_completions_user_lesson_unique" UNIQUE("user_id","lesson_id")
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "quiz_attempts_user_id_idx" ON "quiz_attempts" ("user_id");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "lesson_completions_user_id_idx" ON "lesson_completions" ("user_id");
--> statement-breakpoint

DO $$ BEGIN
    ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint

DO $$ BEGIN
    ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint

DO $$ BEGIN
    ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint

DO $$ BEGIN
    ALTER TABLE "lesson_completions" ADD CONSTRAINT "lesson_completions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint

DO $$ BEGIN
    ALTER TABLE "lesson_completions" ADD CONSTRAINT "lesson_completions_main_lesson_id_main_lessons_id_fk" FOREIGN KEY ("main_lesson_id") REFERENCES "public"."main_lessons"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint

DO $$ BEGIN
    ALTER TABLE "lesson_completions" ADD CONSTRAINT "lesson_completions_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;
