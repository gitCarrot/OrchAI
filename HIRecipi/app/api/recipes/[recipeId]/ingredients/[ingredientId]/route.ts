import { getAuth } from '@clerk/nextjs/server';
import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/db';
import { recipes, recipeIngredients } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';

// 레시피 소유권 확인 함수
async function checkRecipeOwnership(recipeId: number, userId: string) {
  const recipe = await db.query.recipes.findFirst({
    where: eq(recipes.id, recipeId),
  });

  if (!recipe) {
    throw new Error("레시피를 찾을 수 없습니다.");
  }

  if (recipe.ownerId !== userId) {
    throw new Error("레시피에 대한 권한이 없습니다.");
  }

  return recipe;
}

// DELETE /api/recipes/[recipeId]/ingredients/[ingredientId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { recipeId: string; ingredientId: string } }
) {
  try {
    const { userId } = await getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { recipeId, ingredientId } = await Promise.resolve(params);
    const parsedRecipeId = parseInt(recipeId);
    const parsedIngredientId = parseInt(ingredientId);
    if (isNaN(parsedRecipeId) || isNaN(parsedIngredientId)) {
      return NextResponse.json({ error: "유효하지 않은 ID입니다." }, { status: 400 });
    }

    await checkRecipeOwnership(parsedRecipeId, userId);

    // 재료 삭제
    const [deletedIngredient] = await db
      .delete(recipeIngredients)
      .where(and(
        eq(recipeIngredients.id, parsedIngredientId),
        eq(recipeIngredients.recipeId, parsedRecipeId)
      ))
      .returning();

    if (!deletedIngredient) {
      return NextResponse.json({ error: "재료를 찾을 수 없습니다." }, { status: 404 });
    }

    // 삭제된 재료 이후의 순서 재정렬
    await db
      .update(recipeIngredients)
      .set({
        order: sql`${recipeIngredients.order} - 1`,
      })
      .where(and(
        eq(recipeIngredients.recipeId, parsedRecipeId),
        sql`${recipeIngredients.order} > ${deletedIngredient.order}`
      ));

    return NextResponse.json(deletedIngredient);
  } catch (error) {
    console.error("[RECIPE_INGREDIENT_DELETE]", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
} 