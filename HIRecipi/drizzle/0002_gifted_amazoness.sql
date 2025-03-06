CREATE TYPE "public"."category_type" AS ENUM('system', 'custom');--> statement-breakpoint
CREATE TYPE "public"."language" AS ENUM('ko', 'en', 'ja');--> statement-breakpoint
CREATE TABLE "category_translations" (
	"id" serial PRIMARY KEY NOT NULL,
	"category_id" integer NOT NULL,
	"language" text NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refrigerator_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"refrigerator_id" integer NOT NULL,
	"category_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recipe_ingredients" DROP CONSTRAINT "recipe_ingredients_ingredient_id_ingredients_id_fk";
--> statement-breakpoint
DROP INDEX "ingredients_name_idx";--> statement-breakpoint
DROP INDEX "ingredients_category_idx";--> statement-breakpoint
DROP INDEX "recipe_ingredients_ingredient_id_idx";--> statement-breakpoint
DROP INDEX "refrigerator_ingredients_refrigerator_id_idx";--> statement-breakpoint
DROP INDEX "refrigerator_ingredients_ingredient_id_idx";--> statement-breakpoint
ALTER TABLE "recipe_ingredients" DROP CONSTRAINT "recipe_ingredients_recipe_id_ingredient_id_pk";--> statement-breakpoint
ALTER TABLE "refrigerator_ingredients" DROP CONSTRAINT "refrigerator_ingredients_refrigerator_id_ingredient_id_pk";--> statement-breakpoint
ALTER TABLE "categories" ALTER COLUMN "icon" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "categories" ALTER COLUMN "icon" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ALTER COLUMN "user_id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "ingredients" ALTER COLUMN "name" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ALTER COLUMN "unit" SET DATA TYPE varchar(20);--> statement-breakpoint
ALTER TABLE "refrigerators" ALTER COLUMN "name" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "refrigerators" ALTER COLUMN "owner_id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "type" text NOT NULL;--> statement-breakpoint
ALTER TABLE "ingredients" ADD COLUMN "refrigerator_category_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "ingredients" ADD COLUMN "quantity" numeric NOT NULL;--> statement-breakpoint
ALTER TABLE "ingredients" ADD COLUMN "expiry_date" timestamp;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD COLUMN "id" serial PRIMARY KEY NOT NULL;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD COLUMN "category_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD COLUMN "name" varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD COLUMN "order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "refrigerator_ingredients" ADD COLUMN "id" serial PRIMARY KEY NOT NULL;--> statement-breakpoint
ALTER TABLE "category_translations" ADD CONSTRAINT "category_translations_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refrigerator_categories" ADD CONSTRAINT "refrigerator_categories_refrigerator_id_refrigerators_id_fk" FOREIGN KEY ("refrigerator_id") REFERENCES "public"."refrigerators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refrigerator_categories" ADD CONSTRAINT "refrigerator_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "category_translations_category_id_idx" ON "category_translations" USING btree ("category_id");--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_refrigerator_category_id_refrigerator_categories_id_fk" FOREIGN KEY ("refrigerator_category_id") REFERENCES "public"."refrigerator_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refrigerators" ADD CONSTRAINT "refrigerators_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "categories_user_id_idx" ON "categories" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "recipe_ingredients_category_id_idx" ON "recipe_ingredients" USING btree ("category_id");--> statement-breakpoint
ALTER TABLE "categories" DROP COLUMN "name";--> statement-breakpoint
ALTER TABLE "categories" DROP COLUMN "name_ko";--> statement-breakpoint
ALTER TABLE "categories" DROP COLUMN "name_en";--> statement-breakpoint
ALTER TABLE "categories" DROP COLUMN "name_ja";--> statement-breakpoint
ALTER TABLE "categories" DROP COLUMN "is_system";--> statement-breakpoint
ALTER TABLE "ingredients" DROP COLUMN "category";--> statement-breakpoint
ALTER TABLE "recipe_ingredients" DROP COLUMN "ingredient_id";--> statement-breakpoint
ALTER TABLE "refrigerator_ingredients" DROP COLUMN "quantity";--> statement-breakpoint
ALTER TABLE "refrigerator_ingredients" DROP COLUMN "expiry_date";