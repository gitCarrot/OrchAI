import { getAuth } from '@clerk/nextjs/server';
import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/db';
import { recipes, recipeFavorites, recipeTranslations } from '@/db/schema';
import { desc, eq, and, sql } from 'drizzle-orm';
import { getUserId } from '../../refrigerators/utils';

const PAGE_SIZE = 12;

// GET /api/recipes/favorites - 즐겨찾기한 레시피 목록 조회
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get page from query params
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const offset = (page - 1) * PAGE_SIZE;

    // 즐겨찾기한 레시피 목록 조회
    const favoriteRecipes = await db
      .select({
        id: recipes.id,
        type: recipes.type,
        isPublic: recipes.isPublic,
        favoriteCount: recipes.favoriteCount,
        createdAt: recipes.createdAt,
        ownerId: recipes.ownerId,
      })
      .from(recipes)
      .innerJoin(
        recipeFavorites,
        and(
          eq(recipeFavorites.recipeId, recipes.id),
          eq(recipeFavorites.userId, userId)
        )
      )
      .orderBy(desc(recipes.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset);

    // 각 레시피의 번역 정보 조회
    const recipesWithTranslations = await Promise.all(
      favoriteRecipes.map(async (recipe) => {
        const translations = await db.query.recipeTranslations.findMany({
          where: eq(recipeTranslations.recipeId, recipe.id),
        });

        return {
          ...recipe,
          translations: translations.map(translation => ({
            language: translation.language,
            title: translation.title,
            description: translation.description,
            content: translation.content,
          })),
        };
      })
    );

    // Get total count for pagination
    const [{ count }] = await db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(recipes)
      .innerJoin(
        recipeFavorites,
        and(
          eq(recipeFavorites.recipeId, recipes.id),
          eq(recipeFavorites.userId, userId)
        )
      );

    return NextResponse.json({
      recipes: recipesWithTranslations,
      pagination: {
        total: count,
        pageSize: PAGE_SIZE,
        currentPage: page,
        totalPages: Math.ceil(count / PAGE_SIZE),
      },
    });
  } catch (error) {
    console.error("[FAVORITE_RECIPES_GET]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load favorite recipes" },
      { status: 500 }
    );
  }
} 