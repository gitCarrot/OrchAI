CREATE TYPE "public"."invitation_status" AS ENUM('pending', 'accepted', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."shared_role" AS ENUM('admin', 'viewer');--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100),
	"name_ko" varchar(100),
	"name_en" varchar(100),
	"name_ja" varchar(100),
	"icon" varchar(50) NOT NULL,
	"user_id" text,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "language_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"language" text DEFAULT 'ko' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refrigerator_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"refrigerator_id" serial NOT NULL,
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shared_refrigerators" (
	"id" serial PRIMARY KEY NOT NULL,
	"refrigerator_id" integer NOT NULL,
	"owner_id" text NOT NULL,
	"invited_email" text NOT NULL,
	"status" "invitation_status" DEFAULT 'pending' NOT NULL,
	"role" "shared_role" DEFAULT 'viewer' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "favorites" RENAME TO "recipe_favorites";--> statement-breakpoint
ALTER TABLE "recipe_favorites" DROP CONSTRAINT "favorites_recipe_id_recipes_id_fk";
--> statement-breakpoint
DROP INDEX "favorites_user_id_idx";--> statement-breakpoint
DROP INDEX "favorites_recipe_id_idx";--> statement-breakpoint
ALTER TABLE "recipe_favorites" DROP CONSTRAINT "favorites_user_id_recipe_id_pk";--> statement-breakpoint
ALTER TABLE "shared_recipes" DROP CONSTRAINT "shared_recipes_recipe_id_user_id_pk";--> statement-breakpoint
ALTER TABLE "refrigerators" ALTER COLUMN "owner_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "refrigerators" ALTER COLUMN "name" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "refrigerators" ALTER COLUMN "type" SET DEFAULT 'normal';--> statement-breakpoint
ALTER TABLE "recipe_favorites" ADD CONSTRAINT "recipe_favorites_recipe_id_user_id_pk" PRIMARY KEY("recipe_id","user_id");--> statement-breakpoint
ALTER TABLE "ingredients" ADD COLUMN "unit" varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE "ingredients" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "view_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "order_index" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "refrigerators" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "refrigerators" ADD COLUMN "is_shared" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "shared_recipes" ADD COLUMN "id" serial PRIMARY KEY NOT NULL;--> statement-breakpoint
ALTER TABLE "shared_recipes" ADD COLUMN "invited_email" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "shared_recipes" ADD COLUMN "status" "invitation_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "shared_recipes" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "refrigerator_members" ADD CONSTRAINT "refrigerator_members_refrigerator_id_refrigerators_id_fk" FOREIGN KEY ("refrigerator_id") REFERENCES "public"."refrigerators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_refrigerators" ADD CONSTRAINT "shared_refrigerators_refrigerator_id_refrigerators_id_fk" FOREIGN KEY ("refrigerator_id") REFERENCES "public"."refrigerators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "shared_refrigerators_refrigerator_id_idx" ON "shared_refrigerators" USING btree ("refrigerator_id");--> statement-breakpoint
CREATE INDEX "shared_refrigerators_owner_id_idx" ON "shared_refrigerators" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "shared_refrigerators_email_idx" ON "shared_refrigerators" USING btree ("invited_email");--> statement-breakpoint
CREATE INDEX "shared_refrigerators_status_idx" ON "shared_refrigerators" USING btree ("status");--> statement-breakpoint
ALTER TABLE "recipe_favorites" ADD CONSTRAINT "recipe_favorites_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "type_public_idx" ON "recipes" USING btree ("type","is_public");--> statement-breakpoint
CREATE INDEX "order_index_idx" ON "recipes" USING btree ("order_index");--> statement-breakpoint
CREATE INDEX "shared_recipes_email_idx" ON "shared_recipes" USING btree ("invited_email");--> statement-breakpoint
CREATE INDEX "shared_recipes_status_idx" ON "shared_recipes" USING btree ("status");