import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/db';
import { refrigerators, ingredients, refrigeratorCategories, sharedRefrigerators } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { getUserId } from '../../../../utils';
import { currentUser } from '@clerk/nextjs/server';

// 재료 추가 스키마
const createIngredientSchema = z.object({
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
});

// GET /api/refrigerators/[refrigeratorId]/categories/[categoryId]/ingredients
export async function GET(
  request: NextRequest,
  context: { params: { refrigeratorId: string; categoryId: string } }
) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await Promise.resolve(context.params);
    const { refrigeratorId, categoryId } = params;
    const parsedRefrigeratorId = parseInt(refrigeratorId);
    const parsedCategoryId = parseInt(categoryId);

    if (isNaN(parsedRefrigeratorId) || isNaN(parsedCategoryId)) {
      return NextResponse.json({ error: "유효하지 않은 ID입니다." }, { status: 400 });
    }

    // 냉장고 확인
    const refrigerator = await db.query.refrigerators.findFirst({
      where: eq(refrigerators.id, parsedRefrigeratorId),
    });

    if (!refrigerator) {
      return NextResponse.json({ error: "냉장고를 찾을 수 없습니다." }, { status: 404 });
    }

    // 권한 확인
    const isOwner = refrigerator.ownerId === userId;
    if (!isOwner) {
      const user = await currentUser();
      const userEmail = user?.emailAddresses[0]?.emailAddress;
      if (!userEmail) {
        return NextResponse.json({ error: "이메일 정보를 찾을 수 없습니다." }, { status: 401 });
      }

      const sharedMember = await db.query.sharedRefrigerators.findFirst({
        where: and(
          eq(sharedRefrigerators.refrigeratorId, parsedRefrigeratorId),
          eq(sharedRefrigerators.invitedEmail, userEmail),
          eq(sharedRefrigerators.status, "accepted")
        ),
      });

      if (!sharedMember) {
        return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 });
      }
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

    // 재료 목록 조회
    const ingredientsList = await db.query.ingredients.findMany({
      where: eq(ingredients.refrigeratorCategoryId, refrigeratorCategory.id),
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

    return NextResponse.json(ingredientsList);
  } catch (error) {
    console.error("[INGREDIENTS_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

// POST /api/refrigerators/[refrigeratorId]/categories/[categoryId]/ingredients
export async function POST(
  request: NextRequest,
  context: { params: { refrigeratorId: string; categoryId: string } }
) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await Promise.resolve(context.params);
    const { refrigeratorId, categoryId } = params;
    const parsedRefrigeratorId = parseInt(refrigeratorId);
    const parsedCategoryId = parseInt(categoryId);

    if (isNaN(parsedRefrigeratorId) || isNaN(parsedCategoryId)) {
      return NextResponse.json({ error: "유효하지 않은 ID입니다." }, { status: 400 });
    }

    // 내부 API 호출 여부 확인
    const isInternalCall = request.headers.get('x-api-key') === process.env.INTERNAL_API_KEY;

    // 냉장고 확인
    const refrigerator = await db.query.refrigerators.findFirst({
      where: eq(refrigerators.id, parsedRefrigeratorId),
    });

    if (!refrigerator) {
      return NextResponse.json({ error: "냉장고를 찾을 수 없습니다." }, { status: 404 });
    }

    console.log('[DEBUG] ownerId:', refrigerator.ownerId);
    console.log('[DEBUG] userId:', userId);
    console.log('[DEBUG] isInternalCall:', isInternalCall);

    // 권한 확인 (내부 API 호출이 아닌 경우에만)
    const isOwner = refrigerator.ownerId === userId;
    if (!isInternalCall && !isOwner) {
      const user = await currentUser();
      const userEmail = user?.emailAddresses[0]?.emailAddress;
      if (!userEmail) {
        return NextResponse.json({ error: "이메일 정보를 찾을 수 없습니다." }, { status: 401 });
      }

      const sharedMember = await db.query.sharedRefrigerators.findFirst({
        where: and(
          eq(sharedRefrigerators.refrigeratorId, parsedRefrigeratorId),
          eq(sharedRefrigerators.invitedEmail, userEmail),
          eq(sharedRefrigerators.status, "accepted")
        ),
      });

      if (!sharedMember || sharedMember.role === 'viewer') {
        return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 });
      }
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

    // 요청 데이터 검증
    const json = await request.json();
    const validatedData = createIngredientSchema.safeParse(json);
    if (!validatedData.success) {
      return NextResponse.json(
        { error: "데이터 형식이 올바르지 않습니다.", details: validatedData.error.format() },
        { status: 400 }
      );
    }

    const { name, quantity, unit, expiryDate } = validatedData.data;

    // 재료 추가
    const [newIngredient] = await db
      .insert(ingredients)
      .values({
        name: name.toString(),
        refrigeratorCategoryId: refrigeratorCategory.id,
        categoryId: parsedCategoryId,
        quantity: quantity.toString(),
        unit,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // 생성된 재료 정보 조회
    const createdIngredient = await db.query.ingredients.findFirst({
      where: eq(ingredients.id, newIngredient.id),
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

    console.log('[DEBUG] 생성된 재료:', createdIngredient);
    console.log('[DEBUG] refrigeratorCategory ID:', refrigeratorCategory.id);

    return NextResponse.json(createdIngredient);
  } catch (error) {
    console.error("[INGREDIENT_CREATE]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
} 