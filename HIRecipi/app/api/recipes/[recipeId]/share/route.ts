import { clerkClient, getAuth, currentUser } from '@clerk/nextjs/server';
import { NextResponse, NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { recipes, sharedRecipes } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// 레시피 공유 스키마
const shareRecipeSchema = z.object({
  userIds: z.array(z.string().min(1, "유효하지 않은 사용자 ID입니다.")),
  canView: z.boolean().default(true),
});

// POST /api/recipes/[recipeId]/share - 레시피 공유
export async function POST(
  request: NextRequest,
  { params }: { params: { recipeId: string } }
) {
  try {
    const { userId } = await getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    const userEmail = user?.emailAddresses[0]?.emailAddress;
    if (!userEmail) {
      return NextResponse.json({ error: "이메일 정보를 찾을 수 없습니다." }, { status: 401 });
    }

    const recipeId = parseInt(params.recipeId);
    if (isNaN(recipeId)) {
      return new NextResponse('잘못된 레시피 ID입니다.', { status: 400 });
    }

    const existingRecipe = await db
      .select()
      .from(recipes)
      .where(eq(recipes.id, recipeId))
      .limit(1);

    if (existingRecipe.length === 0) {
      return new NextResponse('레시피를 찾을 수 없습니다.', { status: 404 });
    }

    if (existingRecipe[0].ownerId !== userId) {
      return new NextResponse('이 레시피를 공유할 권한이 없습니다.', { status: 403 });
    }

    const body = await request.json();
    const validationResult = shareRecipeSchema.safeParse(body);

    if (!validationResult.success) {
      return new NextResponse(validationResult.error.errors[0].message, { status: 400 });
    }

    const { userIds, canView } = validationResult.data;

    // 기존 공유 삭제
    await db
      .delete(sharedRecipes)
      .where(eq(sharedRecipes.recipeId, recipeId));

    // 새로운 공유 추가
    const result = await db
      .insert(sharedRecipes)
      .values(
        userIds.map(sharedUserId => ({
          recipeId,
          userId: sharedUserId,
          canView,
        }))
      )
      .returning();

    return NextResponse.json(result);
  } catch (error) {
    console.error('[RECIPE_SHARE_POST]', error);
    if (error instanceof z.ZodError) {
      return new NextResponse('잘못된 요청 데이터입니다.', { status: 400 });
    }
    return new NextResponse('레시피를 공유하는 중 오류가 발생했습니다.', { status: 500 });
  }
}

// DELETE /api/recipes/[recipeId]/share - 레시피 공유 취소
export async function DELETE(
  request: Request,
  { params }: { params: { recipeId: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse('로그인이 필요합니다.', { status: 401 });
    }

    const recipeId = parseInt(params.recipeId);
    if (isNaN(recipeId)) {
      return new NextResponse('잘못된 레시피 ID입니다.', { status: 400 });
    }

    const existingRecipe = await db
      .select()
      .from(recipes)
      .where(eq(recipes.id, recipeId))
      .limit(1);

    if (existingRecipe.length === 0) {
      return new NextResponse('레시피를 찾을 수 없습니다.', { status: 404 });
    }

    if (existingRecipe[0].ownerId !== userId) {
      return new NextResponse('이 레시피의 공유를 취소할 권한이 없습니다.', { status: 403 });
    }

    // URL에서 취소할 사용자 ID 가져오기
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('userId');

    if (!targetUserId) {
      return new NextResponse('공유를 취소할 사용자 ID가 필요합니다.', { status: 400 });
    }

    // 공유 취소
    const [canceledShare] = await db
      .delete(sharedRecipes)
      .where(and(
        eq(sharedRecipes.recipeId, recipeId),
        eq(sharedRecipes.userId, targetUserId)
      ))
      .returning();

    if (!canceledShare) {
      return new NextResponse('해당 사용자와 공유되지 않은 레시피입니다.', { status: 404 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[RECIPE_SHARE_DELETE]', error);
    return new NextResponse('레시피 공유를 취소하는 중 오류가 발생했습니다.', { status: 500 });
  }
} 