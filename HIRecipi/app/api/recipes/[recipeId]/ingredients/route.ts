import { getAuth, currentUser } from '@clerk/nextjs/server';
import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/db';
import { recipes, recipeIngredients, categories } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const ingredientSchema = z.object({
  name: z.string().min(1, "재료 이름은 필수입니다."),
  categoryId: z.number().min(1, "카테고리는 필수입니다."),
  quantity: z.number().min(0, "수량은 0 이상이어야 합니다."),
  unit: z.string().min(1, "단위는 필수입니다."),
  order: z.number().min(0).optional(),
});

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

// GET /api/recipes/[recipeId]/ingredients - 레시피 재료 목록 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { recipeId: string } }
) {
  try {
    const { userId } = await getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { recipeId } = await Promise.resolve(params);
    const parsedRecipeId = parseInt(recipeId);
    if (isNaN(parsedRecipeId)) {
      return NextResponse.json({ error: "유효하지 않은 레시피 ID입니다." }, { status: 400 });
    }

    // 레시피 재료 목록 조회 (카테고리 정보 포함)
    const ingredients = await db.query.recipeIngredients.findMany({
      where: eq(recipeIngredients.recipeId, parsedRecipeId),
      with: {
        category: {
          with: {
            translations: true,
          },
        },
      },
      orderBy: (ingredients, { asc }) => [asc(ingredients.order)],
    });

    return NextResponse.json(ingredients);
  } catch (error) {
    console.error("[RECIPE_INGREDIENTS_GET]", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

// POST /api/recipes/[recipeId]/ingredients - 레시피 재료 추가
export async function POST(
  request: NextRequest,
  { params }: { params: { recipeId: string } }
) {
  try {
    const { userId } = await getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { recipeId } = await Promise.resolve(params);
    const parsedRecipeId = parseInt(recipeId);
    if (isNaN(parsedRecipeId)) {
      return NextResponse.json({ error: "유효하지 않은 레시피 ID입니다." }, { status: 400 });
    }

    await checkRecipeOwnership(parsedRecipeId, userId);

    const json = await request.json();
    const data = ingredientSchema.parse(json);

    // 카테고리 존재 여부 확인
    const category = await db.query.categories.findFirst({
      where: eq(categories.id, data.categoryId),
    });

    if (!category) {
      return NextResponse.json({ error: "존재하지 않는 카테고리입니다." }, { status: 400 });
    }

    // 현재 최대 order 값 조회
    const maxOrder = await db.query.recipeIngredients.findFirst({
      where: eq(recipeIngredients.recipeId, parsedRecipeId),
      orderBy: (ingredients, { desc }) => [desc(ingredients.order)],
    });

    const nextOrder = maxOrder ? (maxOrder.order || 0) + 1 : 0;

    // 재료 추가
    const [ingredient] = await db
      .insert(recipeIngredients)
      .values({
        recipeId: parsedRecipeId,
        name: data.name,
        categoryId: data.categoryId,
        quantity: data.quantity,
        unit: data.unit,
        order: data.order ?? nextOrder,
      })
      .returning();

    return NextResponse.json(ingredient);
  } catch (error) {
    console.error("[RECIPE_INGREDIENT_CREATE]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.errors },
        { status: 400 }
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

// PUT /api/recipes/[recipeId]/ingredients/reorder - 레시피 재료 순서 변경
export async function PUT(
  request: NextRequest,
  { params }: { params: { recipeId: string } }
) {
  try {
    const { userId } = await getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { recipeId } = await Promise.resolve(params);
    const parsedRecipeId = parseInt(recipeId);
    if (isNaN(parsedRecipeId)) {
      return NextResponse.json({ error: "유효하지 않은 레시피 ID입니다." }, { status: 400 });
    }

    await checkRecipeOwnership(parsedRecipeId, userId);

    const json = await request.json();
    const { ingredients } = json;

    if (!Array.isArray(ingredients)) {
      return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
    }

    // 재료 순서 일괄 업데이트
    const updates = ingredients.map((ingredient, index) => 
      db
        .update(recipeIngredients)
        .set({ order: index })
        .where(and(
          eq(recipeIngredients.id, ingredient.id),
          eq(recipeIngredients.recipeId, parsedRecipeId)
        ))
    );

    await Promise.all(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[RECIPE_INGREDIENTS_REORDER]", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
} 