CREATE TABLE IF NOT EXISTS "analytics" (
	"id" serial PRIMARY KEY NOT NULL,
	"lesson_id" integer,
	"quiz_id" integer,
	"completions" integer DEFAULT 0,
	"average_score" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "blacklist" (
	"token" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expired_at" timestamp NOT NULL,
	CONSTRAINT "blacklist_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lesson_type" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"icon" text NOT NULL,
	"icon_mode" text DEFAULT 'raw' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lessons" (
	"id" serial PRIMARY KEY NOT NULL,
	"main_lesson_id" integer NOT NULL,
	"lesson_type_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"level" text NOT NULL,
	"image" text NOT NULL,
	"sections" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "main_lessons" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"image_cover" text NOT NULL,
	"free" boolean DEFAULT true NOT NULL,
	"price" integer,
	"product_id" text,
	"order" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "purchase_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"purchase_id" varchar NOT NULL,
	"user_id" integer NOT NULL,
	"user_email" varchar NOT NULL,
	"main_lesson_id" integer NOT NULL,
	"purchase_amount" integer NOT NULL,
	"payment_method" varchar,
	"platform_type" varchar,
	"payment_status" varchar,
	"purchase_date" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ph_purchase_id_user_id_lesson_id_unique" UNIQUE("purchase_id","user_id","main_lesson_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "quizzes" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"lesson_id" integer,
	"questions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"role" varchar(50) DEFAULT 'student' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"reset_token" varchar,
	"registration_type" varchar DEFAULT 'authenication' NOT NULL,
	"last_login" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lessons" ADD CONSTRAINT "lessons_main_lesson_id_main_lessons_id_fk" FOREIGN KEY ("main_lesson_id") REFERENCES "public"."main_lessons"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lessons" ADD CONSTRAINT "lessons_lesson_type_id_lesson_type_id_fk" FOREIGN KEY ("lesson_type_id") REFERENCES "public"."lesson_type"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_history" ADD CONSTRAINT "purchase_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_history" ADD CONSTRAINT "purchase_history_user_email_users_email_fk" FOREIGN KEY ("user_email") REFERENCES "public"."users"("email") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_history" ADD CONSTRAINT "purchase_history_main_lesson_id_main_lessons_id_fk" FOREIGN KEY ("main_lesson_id") REFERENCES "public"."main_lessons"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;
