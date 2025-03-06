import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/db';
import { recipes, recipeFavorites, recipeTranslations, tags, tagTranslations, recipeTags } from '@/db/schema';
import { desc, eq, sql, and, or, ilike } from 'drizzle-orm';
import { getUserId } from '../../../refrigerators/utils';

// POST /api/recipes/favorites/search - 즐겨찾기한 레시피 검색
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get search params from request body
    const body = await request.json();
    const { keyword, language = 'ko' } = body;

    if (!keyword?.trim()) {
      return NextResponse.json({ error: "검색어를 입력해주세요." }, { status: 400 });
    }

    // 언어 유효성 검사
    const validLanguage = ['ko', 'en', 'ja'].includes(language) ? language : 'ko';

    // Search favorite recipes with keyword (제목, 내용, 설명, 태그 포함)
    const searchResults = await db
      .select({
        id: recipes.id,
        type: recipes.type,
        isPublic: recipes.isPublic,
        favoriteCount: recipes.favoriteCount,
        createdAt: recipes.createdAt,
        ownerId: recipes.ownerId,
        translations: recipeTranslations
      })
      .from(recipes)
      .leftJoin(
        recipeTranslations,
        and(
          eq(recipes.id, recipeTranslations.recipeId),
          eq(recipeTranslations.language, validLanguage)
        )
      )
      .innerJoin(
        recipeFavorites,
        and(
          eq(recipeFavorites.recipeId, recipes.id),
          eq(recipeFavorites.userId, userId)
        )
      )
      // 태그 정보 조인
      .leftJoin(
        recipeTags,
        eq(recipeTags.recipeId, recipes.id)
      )
      .leftJoin(
        tags,
        eq(recipeTags.tagId, tags.id)
      )
      .leftJoin(
        tagTranslations,
        and(
          eq(tagTranslations.tagId, tags.id),
          eq(tagTranslations.language, validLanguage)
        )
      )
      .where(
        or(
          ilike(recipeTranslations.title, `%${keyword}%`),
          ilike(recipeTranslations.content, `%${keyword}%`),
          ilike(recipeTranslations.description || '', `%${keyword}%`),
          // 태그 이름에서도 검색
          ilike(tagTranslations.name, `%${keyword}%`)
        )
      )
      .orderBy(desc(recipes.createdAt));

    // 중복 제거 (태그 조인으로 인해 중복된 레시피가 있을 수 있음)
    const uniqueRecipeIds = new Set();
    const uniqueSearchResults = searchResults.filter(recipe => {
      if (uniqueRecipeIds.has(recipe.id)) {
        return false;
      }
      uniqueRecipeIds.add(recipe.id);
      return true;
    });

    return NextResponse.json({
      recipes: uniqueSearchResults,
      total: uniqueSearchResults.length,
      message: uniqueSearchResults.length === 0 ? "검색 결과가 없습니다." : undefined
    });
  } catch (error) {
    console.error("[FAVORITE_RECIPES_SEARCH]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
} 