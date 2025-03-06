import { getAuth } from '@clerk/nextjs/server';
import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/db';
import { recipes, recipeFavorites, recipeTranslations } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

// GET /api/recipes/[recipeId]/favorites/check - 레시피 즐겨찾기 상태 확인
export async function GET(
  request: NextRequest,
  context: { params: { recipeId: string } }
) {
  try {
    const { userId } = await getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { recipeId } = await Promise.resolve(context.params);
    const recipeIdNum = parseInt(recipeId);
    if (isNaN(recipeIdNum)) {
      return NextResponse.json({ error: "유효하지 않은 레시피 ID입니다." }, { status: 400 });
    }

    // 레시피와 번역 정보 함께 조회
    const result = await db
      .select({
        recipe: {
          id: recipes.id,
          type: recipes.type,
          isPublic: recipes.isPublic,
          favoriteCount: recipes.favoriteCount,
          createdAt: recipes.createdAt,
          ownerId: recipes.ownerId,
        },
        translations: recipeTranslations
      })
      .from(recipes)
      .leftJoin(
        recipeTranslations,
        eq(recipes.id, recipeTranslations.recipeId)
      )
      .where(eq(recipes.id, recipeIdNum));

    if (result.length === 0) {
      return NextResponse.json({ error: "레시피를 찾을 수 없습니다." }, { status: 404 });
    }

    // 즐겨찾기 상태 확인
    const favorite = await db
      .select()
      .from(recipeFavorites)
      .where(
        and(
          eq(recipeFavorites.recipeId, recipeIdNum),
          eq(recipeFavorites.userId, userId)
        )
      )
      .limit(1);

    // 응답 데이터 구성
    const response = {
      ...result[0].recipe,
      translations: result
        .filter(r => r.translations !== null)
        .map(r => ({
          language: r.translations?.language,
          title: r.translations?.title,
          description: r.translations?.description,
          content: r.translations?.content
        })),
      isFavorited: favorite.length > 0
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[RECIPE_FAVORITE_CHECK]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
} 