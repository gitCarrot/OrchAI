import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/db';
import { refrigerators, ingredients, refrigeratorCategories, sharedRefrigerators } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { getUserId } from '../../../../../utils';
import { currentUser } from '@clerk/nextjs/server';

// 재료 수정 스키마
const updateIngredientSchema = z.object({
  name: z.string().min(1, '재료 이름을 입력해주세요.'),
  quantity: z.string().min(1, '수량을 입력해주세요.').transform(val => parseInt(val, 10)),
  unit: z.enum(['g', 'kg', 'ml', 'l', '개', '봉', '팩', '병'], {
    required_error: '단위를 선택해주세요.',
  }),
  expiryDate: z.union([
    z.string().datetime(),
    z.string().length(0).transform(() => null),
    z.null(),
  ]).optional().nullable(),
  refrigeratorCategoryId: z.number().optional(),
});

// 접근 권한 확인 유틸리티 함수
async function checkAccess(refrigeratorId: number, userId: string, method: string = 'GET') {
  const refrigerator = await db.query.refrigerators.findFirst({
    where: eq(refrigerators.id, refrigeratorId),
  });

  if (!refrigerator) {
    return { error: "냉장고를 찾을 수 없습니다.", status: 404 };
  }

  const isOwner = refrigerator.ownerId === userId;

  // 공유 멤버 권한 확인
  const user = await currentUser();
  const userEmail = user?.emailAddresses[0]?.emailAddress;
  if (!userEmail) {
    return { error: "이메일 정보를 찾을 수 없습니다.", status: 401 };
  }

  const sharedMember = await db.query.sharedRefrigerators.findFirst({
    where: and(
      eq(sharedRefrigerators.refrigeratorId, refrigeratorId),
      eq(sharedRefrigerators.invitedEmail, userEmail),
      eq(sharedRefrigerators.status, "accepted")
    ),
  });

  if (!isOwner && (!sharedMember || (sharedMember.role === 'viewer' && method !== 'GET'))) {
    return { error: "접근 권한이 없습니다.", status: 403 };
  }

  return { isOwner, refrigerator };
}

// PATCH /api/refrigerators/[refrigeratorId]/categories/[categoryId]/ingredients/[ingredientId]
export async function PATCH(
  request: NextRequest,
  context: { params: { refrigeratorId: string; categoryId: string; ingredientId: string } }
) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await Promise.resolve(context.params);
    const { refrigeratorId, categoryId, ingredientId } = params;
    const parsedRefrigeratorId = parseInt(refrigeratorId);
    const parsedCategoryId = parseInt(categoryId);
    const parsedIngredientId = parseInt(ingredientId);

    if (isNaN(parsedRefrigeratorId) || isNaN(parsedCategoryId) || isNaN(parsedIngredientId)) {
      return NextResponse.json({ error: "유효하지 않은 ID입니다." }, { status: 400 });
    }

    // 접근 권한 확인
    const accessCheck = await checkAccess(parsedRefrigeratorId, userId, 'PATCH');
    if ('error' in accessCheck) {
      return NextResponse.json({ error: accessCheck.error }, { status: accessCheck.status });
    }

    // 카테고리 확인
    const refrigeratorCategory = await db.query.refrigeratorCategories.findFirst({
      where: and(
        eq(refrigeratorCategories.refrigeratorId, parsedRefrigeratorId),
        eq(refrigeratorCategories.categoryId, parsedCategoryId)
      ),
    });

    if (!refrigeratorCategory) {
      return NextResponse.json({ error: "카테고리를 찾을 수 없습니다." }, { status: 404 });
    }

    // 재료 확인
    const ingredient = await db.query.ingredients.findFirst({
      where: eq(ingredients.id, parsedIngredientId),
    });

    if (!ingredient) {
      return NextResponse.json({ error: "재료를 찾을 수 없습니다." }, { status: 404 });
    }

    // 요청 데이터 검증
    const json = await request.json();
    const validatedData = updateIngredientSchema.safeParse(json);
    if (!validatedData.success) {
      return NextResponse.json(
        { error: "데이터 형식이 올바르지 않습니다.", details: validatedData.error.format() },
        { status: 400 }
      );
    }

    const { name, quantity, unit, expiryDate, refrigeratorCategoryId } = validatedData.data;

    // 카테고리 변경이 있는 경우, 새 카테고리 확인
    let targetRefrigeratorCategoryId = refrigeratorCategory.id;
    if (refrigeratorCategoryId) {
      const newRefrigeratorCategory = await db.query.refrigeratorCategories.findFirst({
        where: and(
          eq(refrigeratorCategories.id, refrigeratorCategoryId),
          eq(refrigeratorCategories.refrigeratorId, parsedRefrigeratorId)
        ),
      });

      if (!newRefrigeratorCategory) {
        return NextResponse.json({ error: "새로운 카테고리를 찾을 수 없습니다." }, { status: 404 });
      }

      targetRefrigeratorCategoryId = newRefrigeratorCategory.id;
    }

    // 재료 수정
    const [updatedIngredient] = await db
      .update(ingredients)
      .set({
        name,
        quantity: quantity.toString(),
        unit,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        refrigeratorCategoryId: targetRefrigeratorCategoryId,
        updatedAt: new Date(),
      })
      .where(eq(ingredients.id, parsedIngredientId))
      .returning();

    // 수정된 재료 정보 조회
    const result = await db.query.ingredients.findFirst({
      where: eq(ingredients.id, updatedIngredient.id),
      with: {
        refrigeratorCategory: {
          with: {
            category: {
              with: {
                translations: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[INGREDIENT_UPDATE]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

// DELETE /api/refrigerators/[refrigeratorId]/categories/[categoryId]/ingredients/[ingredientId]
export async function DELETE(
  request: NextRequest,
  context: { params: { refrigeratorId: string; categoryId: string; ingredientId: string } }
) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await Promise.resolve(context.params);
    const { refrigeratorId, categoryId, ingredientId } = params;
    const parsedRefrigeratorId = parseInt(refrigeratorId);
    const parsedCategoryId = parseInt(categoryId);
    const parsedIngredientId = parseInt(ingredientId);

    if (isNaN(parsedRefrigeratorId) || isNaN(parsedCategoryId) || isNaN(parsedIngredientId)) {
      return NextResponse.json({ error: "유효하지 않은 ID입니다." }, { status: 400 });
    }

    // 접근 권한 확인
    const accessCheck = await checkAccess(parsedRefrigeratorId, userId, 'DELETE');
    if ('error' in accessCheck) {
      return NextResponse.json({ error: accessCheck.error }, { status: accessCheck.status });
    }

    // 카테고리 확인
    const refrigeratorCategory = await db.query.refrigeratorCategories.findFirst({
      where: and(
        eq(refrigeratorCategories.refrigeratorId, parsedRefrigeratorId),
        eq(refrigeratorCategories.categoryId, parsedCategoryId)
      ),
    });

    if (!refrigeratorCategory) {
      return NextResponse.json({ error: "카테고리를 찾을 수 없습니다." }, { status: 404 });
    }

    // 재료 확인 및 삭제
    const [deletedIngredient] = await db
      .delete(ingredients)
      .where(and(
        eq(ingredients.id, parsedIngredientId),
        eq(ingredients.refrigeratorCategoryId, refrigeratorCategory.id)
      ))
      .returning();

    if (!deletedIngredient) {
      return NextResponse.json({ error: "재료를 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json(deletedIngredient);
  } catch (error) {
    console.error("[INGREDIENT_DELETE]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
} 