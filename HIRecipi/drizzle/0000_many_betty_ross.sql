DO $$ BEGIN
  CREATE TYPE "recipe_type" AS ENUM('custom', 'ai');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "refrigerator_type" AS ENUM('normal', 'virtual');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "invitation_status" AS ENUM('pending', 'accepted', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE "favorites" (
	"user_id" varchar(255) NOT NULL,
	"recipe_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "favorites_user_id_recipe_id_pk" PRIMARY KEY("user_id","recipe_id")
);

CREATE TABLE "ingredients" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"category" varchar(100) NOT NULL,
	"unit" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "recipe_ingredients" (
	"recipe_id" integer NOT NULL,
	"ingredient_id" integer NOT NULL,
	"quantity" integer NOT NULL,
	"unit" varchar(50) NOT NULL,
	CONSTRAINT "recipe_ingredients_recipe_id_ingredient_id_pk" PRIMARY KEY("recipe_id","ingredient_id")
);

CREATE TABLE "recipes" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_id" varchar(255) NOT NULL,
	"type" "recipe_type" NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"favorite_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "refrigerator_ingredients" (
	"refrigerator_id" integer NOT NULL,
	"ingredient_id" integer NOT NULL,
	"quantity" integer NOT NULL,
	"expiry_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "refrigerator_ingredients_refrigerator_id_ingredient_id_pk" PRIMARY KEY("refrigerator_id","ingredient_id")
);

CREATE TABLE IF NOT EXISTS "refrigerators" (
    "id" SERIAL PRIMARY KEY,
    "name" text NOT NULL,
    "description" text NULL,
    "type" "refrigerator_type" NOT NULL DEFAULT 'normal',
    "owner_id" text NOT NULL,
    "is_shared" boolean NOT NULL DEFAULT false,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE "shared_recipes" (
	"recipe_id" integer NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"can_view" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shared_recipes_recipe_id_user_id_pk" PRIMARY KEY("recipe_id","user_id")
);

CREATE TABLE IF NOT EXISTS "shared_refrigerators" (
    "id" SERIAL PRIMARY KEY,
    "refrigerator_id" integer NOT NULL REFERENCES "refrigerators"("id") ON DELETE CASCADE,
    "owner_id" text NOT NULL,
    "invited_email" text NOT NULL,
    "status" "invitation_status" NOT NULL DEFAULT 'pending',
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
);

ALTER TABLE "favorites" ADD CONSTRAINT "favorites_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "refrigerator_ingredients" ADD CONSTRAINT "refrigerator_ingredients_refrigerator_id_refrigerators_id_fk" FOREIGN KEY ("refrigerator_id") REFERENCES "public"."refrigerators"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "refrigerator_ingredients" ADD CONSTRAINT "refrigerator_ingredients_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "shared_recipes" ADD CONSTRAINT "shared_recipes_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;

CREATE INDEX "favorites_user_id_idx" ON "favorites" USING btree ("user_id");
CREATE INDEX "favorites_recipe_id_idx" ON "favorites" USING btree ("recipe_id");
CREATE INDEX "ingredients_name_idx" ON "ingredients" USING btree ("name");
CREATE INDEX "ingredients_category_idx" ON "ingredients" USING btree ("category");
CREATE INDEX "recipe_ingredients_recipe_id_idx" ON "recipe_ingredients" USING btree ("recipe_id");
CREATE INDEX "recipe_ingredients_ingredient_id_idx" ON "recipe_ingredients" USING btree ("ingredient_id");
CREATE INDEX "owner_id_idx" ON "recipes" USING btree ("owner_id");
CREATE INDEX "title_idx" ON "recipes" USING btree ("title");
CREATE INDEX "refrigerator_ingredients_refrigerator_id_idx" ON "refrigerator_ingredients" USING btree ("refrigerator_id");
CREATE INDEX "refrigerator_ingredients_ingredient_id_idx" ON "refrigerator_ingredients" USING btree ("ingredient_id");
CREATE INDEX "refrigerators_owner_id_idx" ON "refrigerators" USING btree ("owner_id");
CREATE INDEX "shared_recipes_recipe_id_idx" ON "shared_recipes" USING btree ("recipe_id");
CREATE INDEX "shared_recipes_user_id_idx" ON "shared_recipes" USING btree ("user_id");
CREATE INDEX "shared_refrigerators_refrigerator_id_idx" ON "shared_refrigerators" ("refrigerator_id");
CREATE INDEX "shared_refrigerators_owner_id_idx" ON "shared_refrigerators" ("owner_id");
CREATE INDEX "shared_refrigerators_email_idx" ON "shared_refrigerators" ("invited_email");
CREATE INDEX "shared_refrigerators_status_idx" ON "shared_refrigerators" ("status");