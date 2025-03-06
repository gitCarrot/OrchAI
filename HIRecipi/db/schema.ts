import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  json,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  varchar,
  uuid,
  unique,
  numeric,
  vector,
  uniqueIndex
} from "drizzle-orm/pg-core";
import { vector as pgvector } from "pgvector/drizzle-orm";
import { z } from 'zod';

// 공통으로 사용되는 타임스탬프 필드
const createdAt = timestamp("created_at").notNull().defaultNow();
const updatedAt = timestamp("updated_at").notNull().defaultNow();

// 언어 타입 Enum
export const languageEnum = pgEnum('language', ['ko', 'en', 'ja']);

// 카테고리 타입 Enum
export const categoryTypeEnum = pgEnum('category_type', ['system', 'custom']);

// 레시피 타입 Enum
export const recipeTypeEnum = pgEnum('recipe_type', ['custom', 'ai']);

// 초대 상태 Enum
export const invitationStatusEnum = pgEnum('invitation_status', ['pending', 'accepted', 'rejected']);

// 냉장고 타입 Enum
export const refrigeratorTypeEnum = pgEnum('refrigerator_type', ['normal', 'virtual']);

// 공유 권한 enum
export const sharedRoleEnum = pgEnum("shared_role", ["admin", "viewer"]);

// 사용자 테이블 (Clerk과 연동)
export const users = pgTable('users', {
  id: varchar('id', { length: 255 }).primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  createdAt,
  updatedAt,
});

// 냉장고 테이블
export const refrigerators = pgTable(
  "refrigerators",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    type: refrigeratorTypeEnum("type").notNull().default("normal"),
    ownerId: varchar("owner_id", { length: 255 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
    isShared: boolean("is_shared").notNull().default(false),
    createdAt,
    updatedAt,
  },
  (table) => ({
    ownerIdIndex: index("refrigerators_owner_id_idx").on(table.ownerId),
  })
);

// 카테고리 테이블
export const categories = pgTable(
  "categories",
  {
    id: serial("id").primaryKey(),
    type: text('type', { enum: ['system', 'custom'] }).notNull(),
    icon: text('icon'),
    userId: varchar("user_id", { length: 255 }).references(() => users.id, { onDelete: 'cascade' }),
    createdAt,
    updatedAt,
  },
  (table) => ({
    userIdIndex: index("categories_user_id_idx").on(table.userId),
  })
);

// 카테고리 번역 테이블
export const categoryTranslations = pgTable(
  "category_translations",
  {
    id: serial("id").primaryKey(),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    language: text('language', { enum: ['ko', 'en', 'ja'] }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    createdAt,
    updatedAt,
  },
  (table) => ({
    categoryIdIndex: index("category_translations_category_id_idx").on(table.categoryId),
  })
);

// 냉장고-재료 테이블
export const refrigeratorIngredients = pgTable('refrigerator_ingredients', {
  id: serial('id').primaryKey(),
  refrigeratorId: integer('refrigerator_id').notNull().references(() => refrigerators.id, { onDelete: 'cascade' }),
  ingredientId: integer('ingredient_id').notNull().references(() => ingredients.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const refrigeratorIngredientsRelations = relations(refrigeratorIngredients, ({ one }) => ({
  refrigerator: one(refrigerators, {
    fields: [refrigeratorIngredients.refrigeratorId],
    references: [refrigerators.id],
  }),
  ingredient: one(ingredients, {
    fields: [refrigeratorIngredients.ingredientId],
    references: [ingredients.id],
  }),
}));

// 레시피 테이블
export const recipes = pgTable('recipes', {
  id: serial('id').primaryKey(),
  type: text('type', { enum: ['custom', 'ai'] }).notNull(),
  isPublic: boolean('is_public').notNull().default(false),
  favoriteCount: integer('favorite_count').notNull().default(0),
  ownerId: text('owner_id').notNull(),
  embedding: vector('embedding', { dimensions: 1536 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// 레시피 관계 정의 (하나로 통합)
export const recipesRelations = relations(recipes, ({ many }) => ({
  translations: many(recipeTranslations),
  tags: many(recipeTags),
  ingredients: many(recipeIngredients),
  favoritedBy: many(recipeFavorites),
  sharedWith: many(sharedRecipes),
}));

// 레시피 번역 테이블
export const recipeTranslations = pgTable('recipe_translations', {
  id: serial('id').primaryKey(),
  recipeId: integer('recipe_id').notNull().references(() => recipes.id, { onDelete: 'cascade' }),
  language: text('language', { enum: ['ko', 'en', 'ja'] }).notNull(),
  title: text('title').notNull(),
  description: text('description'),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// 레시피 번역 관계 정의
export const recipeTranslationsRelations = relations(recipeTranslations, ({ one }) => ({
  recipe: one(recipes, {
    fields: [recipeTranslations.recipeId],
    references: [recipes.id],
  }),
}));

// 태그 테이블
export const tags = pgTable('tags', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  nameUnique: unique('tags_name_unique_idx').on(table.name),
}));

// 태그 관계 정의
export const tagsRelations = relations(tags, ({ many }) => ({
  translations: many(tagTranslations),
  recipes: many(recipeTags),
}));

// 태그 번역 테이블
export const tagTranslations = pgTable('tag_translations', {
  id: serial('id').primaryKey(),
  tagId: integer('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
  language: text('language', { enum: ['ko', 'en', 'ja'] }).notNull(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  tagLanguageUnique: unique('tag_language_unique_idx').on(table.tagId, table.language),
}));

// 태그 번역 관계 정의
export const tagTranslationsRelations = relations(tagTranslations, ({ one }) => ({
  tag: one(tags, {
    fields: [tagTranslations.tagId],
    references: [tags.id],
  }),
}));

// 레시피-태그 연결 테이블
export const recipeTags = pgTable('recipe_tags', {
  id: serial('id').primaryKey(),
  recipeId: integer('recipe_id').notNull().references(() => recipes.id, { onDelete: 'cascade' }),
  tagId: integer('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  recipeTagUnique: unique('recipe_tag_unique_idx').on(table.recipeId, table.tagId),
}));

// 레시피-태그 관계 정의
export const recipeTagsRelations = relations(recipeTags, ({ one }) => ({
  recipe: one(recipes, {
    fields: [recipeTags.recipeId],
    references: [recipes.id],
  }),
  tag: one(tags, {
    fields: [recipeTags.tagId],
    references: [tags.id],
  }),
}));

// IVFFlat 인덱스 생성을 위한 SQL
sql`
  CREATE EXTENSION IF NOT EXISTS vector;
  
  -- IVFFlat 인덱스 생성
  CREATE INDEX IF NOT EXISTS recipe_embedding_idx 
  ON recipes 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);  -- 리스트 수는 데이터 크기에 따라 조정
`;

// 레시피-재료 테이블
export const recipeIngredients = pgTable(
  "recipe_ingredients",
  {
    id: serial('id').primaryKey(),
    recipeId: integer('recipe_id')
      .notNull()
      .references(() => recipes.id, { onDelete: 'cascade' }),
    categoryId: integer('category_id')
      .notNull()
      .references(() => categories.id),
    name: varchar('name', { length: 100 }).notNull(),
    quantity: integer('quantity').notNull(),
    unit: varchar('unit', { length: 20 }).notNull(),
    order: integer('order').notNull().default(0),
    createdAt,
    updatedAt,
  },
  (table) => ({
    recipeIdIndex: index("recipe_ingredients_recipe_id_idx").on(table.recipeId),
    categoryIdIndex: index("recipe_ingredients_category_id_idx").on(table.categoryId),
  })
);

// 레시피 공유 테이블
export const sharedRecipes = pgTable(
  "shared_recipes",
  {
    id: serial("id").primaryKey(),
    recipeId: integer("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 255 }).notNull(),
    invitedEmail: varchar("invited_email", { length: 255 }).notNull(),
    status: invitationStatusEnum("status").default("pending").notNull(),
    canView: boolean("can_view").default(true).notNull(),
    createdAt,
    updatedAt,
  },
  (table) => ({
    recipeIdIndex: index("shared_recipes_recipe_id_idx").on(table.recipeId),
    userIdIndex: index("shared_recipes_user_id_idx").on(table.userId),
    emailIndex: index("shared_recipes_email_idx").on(table.invitedEmail),
    statusIndex: index("shared_recipes_status_idx").on(table.status),
  })
);

// 냉장고 공유 테이블
export const sharedRefrigerators = pgTable(
  "shared_refrigerators",
  {
    id: serial("id").primaryKey(),
    refrigeratorId: integer("refrigerator_id")
      .notNull()
      .references(() => refrigerators.id, { onDelete: "cascade" }),
    ownerId: text("owner_id").notNull(),
    invitedEmail: text("invited_email").notNull(),
    status: invitationStatusEnum("status").default("pending").notNull(),
    role: sharedRoleEnum("role").default("viewer").notNull(),
    createdAt,
    updatedAt,
  },
  (table) => ({
    refrigeratorIdIndex: index("shared_refrigerators_refrigerator_id_idx").on(table.refrigeratorId),
    ownerIdIndex: index("shared_refrigerators_owner_id_idx").on(table.ownerId),
    emailIndex: index("shared_refrigerators_email_idx").on(table.invitedEmail),
    statusIndex: index("shared_refrigerators_status_idx").on(table.status),
  })
);

// 즐겨찾기 테이블 (Many-to-Many)
export const recipeFavorites = pgTable(
  "recipe_favorites",
  {
    recipeId: integer("recipe_id")
      .references(() => recipes.id)
      .notNull(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.recipeId, table.userId] }),
  })
);

// 냉장고-카테고리 테이블
export const refrigeratorCategories = pgTable(
  "refrigerator_categories",
  {
    id: serial("id").primaryKey(),
    refrigeratorId: integer("refrigerator_id")
      .notNull()
      .references(() => refrigerators.id, { onDelete: "cascade" }),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    createdAt,
    updatedAt,
  },
  (table) => ({
    refrigeratorIdIndex: index("refrigerator_categories_refrigerator_id_idx").on(table.refrigeratorId),
    categoryIdIndex: index("refrigerator_categories_category_id_idx").on(table.categoryId),
  })
);

// 재료 테이블
export const ingredients = pgTable(
  "ingredients",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    quantity: numeric("quantity").notNull(),
    unit: varchar("unit", { length: 50 }).notNull(),
    expiryDate: timestamp("expiry_date"),
    refrigeratorCategoryId: integer("refrigerator_category_id")
      .notNull()
      .references(() => refrigeratorCategories.id, { onDelete: "cascade" }),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id),
    createdAt,
    updatedAt,
  },
  (table) => ({
    refrigeratorCategoryIdIndex: index("ingredients_refrigerator_category_id_idx").on(table.refrigeratorCategoryId),
    categoryIdIndex: index("ingredients_category_id_idx").on(table.categoryId),
  })
);

// Relations
export const refrigeratorRelations = relations(refrigerators, ({ many }) => ({
  ingredients: many(refrigeratorIngredients),
  sharedWith: many(sharedRefrigerators),
  categories: many(refrigeratorCategories),
}));

export const refrigeratorCategoriesRelations = relations(refrigeratorCategories, ({ one, many }) => ({
  refrigerator: one(refrigerators, {
    fields: [refrigeratorCategories.refrigeratorId],
    references: [refrigerators.id],
  }),
  category: one(categories, {
    fields: [refrigeratorCategories.categoryId],
    references: [categories.id],
  }),
  ingredients: many(ingredients),
}));

export const categoryRelations = relations(categories, ({ many }) => ({
  translations: many(categoryTranslations),
  refrigeratorCategories: many(refrigeratorCategories),
  recipeIngredients: many(recipeIngredients),
}));

export const categoryTranslationRelations = relations(categoryTranslations, ({ one }) => ({
  category: one(categories, {
    fields: [categoryTranslations.categoryId],
    references: [categories.id],
  }),
}));

export const recipeIngredientRelations = relations(recipeIngredients, ({ one }) => ({
  recipe: one(recipes, {
    fields: [recipeIngredients.recipeId],
    references: [recipes.id],
  }),
  category: one(categories, {
    fields: [recipeIngredients.categoryId],
    references: [categories.id],
  }),
}));

export const sharedRecipesRelations = relations(sharedRecipes, ({ one }) => ({
  recipe: one(recipes, {
    fields: [sharedRecipes.recipeId],
    references: [recipes.id],
  }),
}));

export const sharedRefrigeratorsRelations = relations(sharedRefrigerators, ({ one }) => ({
  refrigerator: one(refrigerators, {
    fields: [sharedRefrigerators.refrigeratorId],
    references: [refrigerators.id],
  }),
}));

export const recipeFavoritesRelations = relations(recipeFavorites, ({ one }) => ({
  recipe: one(recipes, {
    fields: [recipeFavorites.recipeId],
    references: [recipes.id],
  }),
}));

export const refrigeratorMembers = pgTable('refrigerator_members', {
  id: serial('id').primaryKey(),
  refrigeratorId: serial('refrigerator_id').references(() => refrigerators.id).notNull(),
  userId: text('user_id').notNull(),
  role: text('role', { enum: ['owner', 'admin', 'viewer'] }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const refrigeratorsRelations = relations(refrigerators, ({ many }) => ({
  members: many(refrigeratorMembers),
}));

export const refrigeratorMembersRelations = relations(refrigeratorMembers, ({ one }) => ({
  refrigerator: one(refrigerators, {
    fields: [refrigeratorMembers.refrigeratorId],
    references: [refrigerators.id],
  }),
}));

// 언어 설정 테이블
export const languagePreferences = pgTable('language_preferences', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  language: text('language', { enum: ['ko', 'en', 'ja'] }).notNull().default('ko'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const ingredientsRelations = relations(ingredients, ({ one }) => ({
  refrigeratorCategory: one(refrigeratorCategories, {
    fields: [ingredients.refrigeratorCategoryId],
    references: [refrigeratorCategories.id],
  }),
  category: one(categories, {
    fields: [ingredients.categoryId],
    references: [categories.id],
  }),
}));

// 타입 정의
export type Recipe = typeof recipes.$inferSelect;
export type NewRecipe = typeof recipes.$inferInsert;
export type RecipeTranslation = typeof recipeTranslations.$inferSelect;
export type NewRecipeTranslation = typeof recipeTranslations.$inferInsert;
export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
export type TagTranslation = typeof tagTranslations.$inferSelect;
export type NewTagTranslation = typeof tagTranslations.$inferInsert;
export type RecipeTag = typeof recipeTags.$inferSelect;
export type NewRecipeTag = typeof recipeTags.$inferInsert; 