-- Rename 'free' -> 'is_free' in main_lessons (idempotent — skipped if already renamed)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'main_lessons' AND column_name = 'free'
    ) THEN
        ALTER TABLE "main_lessons" RENAME COLUMN "free" TO "is_free";
    END IF;
END $$;
--> statement-breakpoint

-- Drop old per-course purchase columns no longer in schema
ALTER TABLE "main_lessons" DROP COLUMN IF EXISTS "price";
--> statement-breakpoint
ALTER TABLE "main_lessons" DROP COLUMN IF EXISTS "product_id";
--> statement-breakpoint

-- Drop old purchase_history table (replaced by subscriptions model)
DROP TABLE IF EXISTS "purchase_history";
--> statement-breakpoint

-- Create subscription_plans table
CREATE TABLE IF NOT EXISTS "subscription_plans" (
    "id" serial PRIMARY KEY NOT NULL,
    "name" varchar NOT NULL,
    "price" integer NOT NULL,
    "product_id_ios" varchar,
    "product_id_android" varchar,
    "description" text,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS "subscriptions" (
    "id" serial PRIMARY KEY NOT NULL,
    "user_id" integer NOT NULL,
    "plan_id" integer NOT NULL,
    "platform" varchar NOT NULL,
    "product_id" varchar NOT NULL,
    "original_transaction_id" varchar NOT NULL,
    "status" varchar DEFAULT 'trial' NOT NULL,
    "current_period_ends_at" timestamp NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "subscriptions_original_transaction_id_unique" UNIQUE("original_transaction_id")
);
--> statement-breakpoint

-- Create subscription_plan_courses join table
CREATE TABLE IF NOT EXISTS "subscription_plan_courses" (
    "plan_id" integer NOT NULL,
    "main_lesson_id" integer NOT NULL,
    CONSTRAINT "subscription_plan_courses_plan_id_main_lesson_id_pk" PRIMARY KEY("plan_id","main_lesson_id")
);
--> statement-breakpoint

DO $$ BEGIN
    ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint

DO $$ BEGIN
    ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id");
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint

DO $$ BEGIN
    ALTER TABLE "subscription_plan_courses" ADD CONSTRAINT "subscription_plan_courses_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint

DO $$ BEGIN
    ALTER TABLE "subscription_plan_courses" ADD CONSTRAINT "subscription_plan_courses_main_lesson_id_main_lessons_id_fk" FOREIGN KEY ("main_lesson_id") REFERENCES "public"."main_lessons"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;
