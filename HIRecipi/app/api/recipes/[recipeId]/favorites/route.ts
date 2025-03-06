import { getAuth } from '@clerk/nextjs/server';
import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/db';
import { recipes, recipeFavorites, recipeTranslations } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { getUserId } from '@/app/api/refrigerators/utils';

// POST /api/recipes/[recipeId]/favorites - 레시피 즐겨찾기 추가
export async function POST(
  request: NextRequest,
  context: { params: { recipeId: string } }
) {
  try {
    const userId  = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { recipeId } = await Promise.resolve(context.params);
    const recipeIdNum = parseInt(recipeId);
    if (isNaN(recipeIdNum)) {
      return NextResponse.json({ error: "유효하지 않은 레시피 ID입니다." }, { status: 400 });
    }

    // 레시피 존재 여부 확인 (번역 포함)
    const recipe = await db
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
        eq(recipes.id, recipeTranslations.recipeId)
      )
      .where(eq(recipes.id, recipeIdNum))
      .limit(1);

    if (!recipe[0]) {
      return NextResponse.json({ error: "레시피를 찾을 수 없습니다." }, { status: 404 });
    }

    // 이미 즐겨찾기한 경우 체크
    const existingFavorite = await db
      .select()
      .from(recipeFavorites)
      .where(
        and(
          eq(recipeFavorites.recipeId, recipeIdNum),
          eq(recipeFavorites.userId, userId)
        )
      )
      .limit(1);

    if (existingFavorite[0]) {
      return NextResponse.json({ error: "이미 즐겨찾기에 추가된 레시피입니다." }, { status: 400 });
    }

    // 즐겨찾기 추가
    await db.transaction(async (tx) => {
      await tx
        .insert(recipeFavorites)
        .values({
          recipeId: recipeIdNum,
          userId,
        });

      await tx
        .update(recipes)
        .set({
          favoriteCount: recipe[0].favoriteCount + 1,
          updatedAt: new Date(),
        })
        .where(eq(recipes.id, recipeIdNum));
    });

    return NextResponse.json({ message: "즐겨찾기에 추가되었습니다." });
  } catch (error) {
    console.error("[RECIPE_FAVORITE_POST]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

// DELETE /api/recipes/[recipeId]/favorites - 레시피 즐겨찾기 삭제
export async function DELETE(
  request: NextRequest,
  context: { params: { recipeId: string } }
) {
  try {
    const userId  = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { recipeId } = await Promise.resolve(context.params);
    const recipeIdNum = parseInt(recipeId);
    if (isNaN(recipeIdNum)) {
      return NextResponse.json({ error: "유효하지 않은 레시피 ID입니다." }, { status: 400 });
    }

    // 레시피 존재 여부 확인 (번역 포함)
    const recipe = await db
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
        eq(recipes.id, recipeTranslations.recipeId)
      )
      .where(eq(recipes.id, recipeIdNum))
      .limit(1);

    if (!recipe[0]) {
      return NextResponse.json({ error: "레시피를 찾을 수 없습니다." }, { status: 404 });
    }

    // 즐겨찾기 삭제 및 카운트 감소
    await db.transaction(async (tx) => {
      const [deleted] = await tx
        .delete(recipeFavorites)
        .where(
          and(
            eq(recipeFavorites.recipeId, recipeIdNum),
            eq(recipeFavorites.userId, userId)
          )
        )
        .returning();

      if (deleted) {
        await tx
          .update(recipes)
          .set({
            favoriteCount: recipe[0].favoriteCount - 1,
            updatedAt: new Date(),
          })
          .where(eq(recipes.id, recipeIdNum));
      }
    });

    return NextResponse.json({ message: "즐겨찾기가 해제되었습니다." });
  } catch (error) {
    console.error("[RECIPE_FAVORITE_DELETE]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
} 