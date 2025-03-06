import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/db';
import { recipes, recipeTags, tags, tagTranslations, recipeTranslations, recipeFavorites } from '@/db/schema';
import { desc, eq, sql, and, or, ilike } from 'drizzle-orm';
import { getUserId } from '../../refrigerators/utils';
import { z } from 'zod';

// 검색 파라미터 스키마
const searchParamsSchema = z.object({
  keyword: z.string().min(1, "검색어를 입력해주세요."),
  language: z.enum(['ko', 'en', 'ja']).default('ko'),
});

// POST /api/recipes/search - 레시피 검색
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    // Get search params from request body
    const body = await request.json();
    const validatedParams = searchParamsSchema.safeParse(body);

    if (!validatedParams.success) {
      return NextResponse.json(
        { error: "잘못된 검색 파라미터입니다.", details: validatedParams.error.format() },
        { status: 400 }
      );
    }

    const { keyword, language } = validatedParams.data;

    // 키워드로 레시피 검색 (제목, 내용, 설명, 태그에서 검색)
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
          eq(recipeTranslations.recipeId, recipes.id),
          eq(recipeTranslations.language, language)
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
          eq(tagTranslations.language, language)
        )
      )
      .where(
        and(
          eq(recipes.isPublic, true),
          or(
            ilike(recipeTranslations.title, `%${keyword}%`),
            ilike(recipeTranslations.content, `%${keyword}%`),
            ilike(recipeTranslations.description || '', `%${keyword}%`),
            // 태그 이름에서도 검색
            ilike(tagTranslations.name, `%${keyword}%`)
          )
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

    // 즐겨찾기 상태 확인 및 응답 데이터 구조화
    const recipesWithFavorites = await Promise.all(
      uniqueSearchResults.map(async (recipe) => {
        const favorite = await db
          .select()
          .from(recipeFavorites)
          .where(
            and(
              eq(recipeFavorites.recipeId, recipe.id),
              eq(recipeFavorites.userId, userId)
            )
          )
          .limit(1);

        return {
          id: recipe.id,
          type: recipe.type,
          isPublic: recipe.isPublic,
          favoriteCount: recipe.favoriteCount,
          createdAt: recipe.createdAt,
          ownerId: recipe.ownerId,
          isFavorited: favorite.length > 0,
          translations: [recipe.translations].filter(Boolean)
        };
      })
    );

    // 빈 결과 처리
    return NextResponse.json({
      recipes: recipesWithFavorites,
      total: recipesWithFavorites.length,
      message: recipesWithFavorites.length === 0 ? "검색 결과가 없습니다." : undefined
    });

  } catch (error) {
    console.error("[RECIPES_SEARCH]", error);
    return NextResponse.json(
      { error: "레시피 검색 중 오류가 발생했습니다.", recipes: [] },
      { status: 500 }
    );
  }
} 