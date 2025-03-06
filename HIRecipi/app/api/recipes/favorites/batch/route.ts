import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/db';
import { recipes, recipeFavorites } from '@/db/schema';
import { and, eq, inArray, sql, desc } from 'drizzle-orm';
import { z } from 'zod';
import { getUserId } from '../../../refrigerators/utils';

// 요청 데이터 검증을 위한 스키마
const batchFavoriteSchema = z.object({
  recipeIds: z.array(z.number()),
  action: z.enum(['add', 'remove'])
});

// GET /api/recipes/favorites/batch - 모든 즐겨찾기한 레시피 목록 조회 (페이지네이션 없음)
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all favorite recipes
    const favoriteRecipes = await db
      .select({
        id: recipes.id,
        title: recipes.title,
        content: recipes.content,
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
      .orderBy(desc(recipes.createdAt));

    return NextResponse.json(favoriteRecipes);
  } catch (error) {
    console.error("[FAVORITE_RECIPES_BATCH_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

// POST /api/recipes/favorites/batch - 여러 레시피 즐겨찾기 일괄 추가/삭제
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 요청 데이터 검증
    const json = await request.json();
    const validatedData = batchFavoriteSchema.safeParse(json);
    
    if (!validatedData.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validatedData.error.format() },
        { status: 400 }
      );
    }

    const { recipeIds, action } = validatedData.data;

    // 레시피 존재 여부 확인
    const existingRecipes = await db.query.recipes.findMany({
      where: inArray(recipes.id, recipeIds),
    });

    if (existingRecipes.length !== recipeIds.length) {
      return NextResponse.json(
        { error: "일부 레시피가 존재하지 않습니다." },
        { status: 404 }
      );
    }

    if (action === 'add') {
      // 이미 즐겨찾기된 레시피 필터링
      const existingFavorites = await db.query.recipeFavorites.findMany({
        where: and(
          eq(recipeFavorites.userId, userId),
          inArray(recipeFavorites.recipeId, recipeIds)
        ),
      });

      const existingRecipeIds = new Set(existingFavorites.map(f => f.recipeId));
      const newRecipeIds = recipeIds.filter(id => !existingRecipeIds.has(id));

      if (newRecipeIds.length > 0) {
        // 새로운 즐겨찾기 추가
        await db.insert(recipeFavorites).values(
          newRecipeIds.map(recipeId => ({
            userId,
            recipeId,
            createdAt: new Date(),
          }))
        );

        // 즐겨찾기 수 업데이트
        await Promise.all(
          newRecipeIds.map(recipeId =>
            db.update(recipes)
              .set({ favoriteCount: sql`${recipes.favoriteCount} + 1` })
              .where(eq(recipes.id, recipeId))
          )
        );
      }

      return NextResponse.json({
        message: "즐겨찾기가 추가되었습니다.",
        addedCount: newRecipeIds.length,
        skippedCount: existingFavorites.length,
      });

    } else {
      // 즐겨찾기 삭제
      const result = await db.delete(recipeFavorites)
        .where(
          and(
            eq(recipeFavorites.userId, userId),
            inArray(recipeFavorites.recipeId, recipeIds)
          )
        )
        .returning();

      // 즐겨찾기 수 업데이트
      await Promise.all(
        result.map(favorite =>
          db.update(recipes)
            .set({ favoriteCount: sql`${recipes.favoriteCount} - 1` })
            .where(eq(recipes.id, favorite.recipeId))
        )
      );

      return NextResponse.json({
        message: "즐겨찾기가 삭제되었습니다.",
        removedCount: result.length,
      });
    }
  } catch (error) {
    console.error("[BATCH_FAVORITES]", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
} 