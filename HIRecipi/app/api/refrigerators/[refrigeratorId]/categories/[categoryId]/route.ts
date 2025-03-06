import { getAuth, currentUser } from '@clerk/nextjs/server';
import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/db';
import { refrigerators, categories, refrigeratorCategories, categoryTranslations, sharedRefrigerators } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { getUserId } from '../../../utils';

// PUT /api/refrigerators/[refrigeratorId]/categories/[categoryId] - 카테고리 수정
export async function PUT(
  request: NextRequest,
  context: { params: { refrigeratorId: string; categoryId: string } }
) {
  try {
    const params = await Promise.resolve(context.params);
    const { refrigeratorId, categoryId } = params;
    console.log('[DEBUG] PUT 카테고리 수정 시작:', { refrigeratorId, categoryId });
    
    const userId  = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsedRefrigeratorId = parseInt(refrigeratorId);
    const parsedCategoryId = parseInt(categoryId);
    
    if (isNaN(parsedRefrigeratorId) || isNaN(parsedCategoryId)) {
      return NextResponse.json({ error: "유효하지 않은 ID입니다." }, { status: 400 });
    }

    // 냉장고 접근 권한 확인
    const refrigerator = await db.query.refrigerators.findFirst({
      where: eq(refrigerators.id, parsedRefrigeratorId),
    });
    console.log('[DEBUG] 조회된 냉장고:', refrigerator);

    if (!refrigerator) {
      return NextResponse.json({ error: "냉장고를 찾을 수 없습니다." }, { status: 404 });
    }

    const isOwner = refrigerator.ownerId === userId;

    // 공유 멤버 권한 확인
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

      if (!sharedMember || sharedMember.role === 'viewer') {
        return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 });
      }
    }

    // 카테고리 정보 조회
    const category = await db.query.categories.findFirst({
      where: eq(categories.id, parsedCategoryId),
      with: {
        translations: true,
      },
    });
    console.log('[DEBUG] 조회된 카테고리:', category);

    if (!category) {
      return NextResponse.json({ error: "카테고리를 찾을 수 없습니다." }, { status: 404 });
    }

    // 냉장고-카테고리 연결 확인
    const refrigeratorCategory = await db.query.refrigeratorCategories.findFirst({
      where: and(
        eq(refrigeratorCategories.refrigeratorId, parsedRefrigeratorId),
        eq(refrigeratorCategories.categoryId, parsedCategoryId)
      ),
    });
    console.log('[DEBUG] 냉장고-카테고리 연결:', refrigeratorCategory);

    if (!refrigeratorCategory) {
      return NextResponse.json({ error: "카테고리를 찾을 수 없습니다." }, { status: 404 });
    }

    const json = await request.json();
    console.log('[DEBUG] 요청 데이터:', json);
    const { icon, translations } = json;

    if (!translations || translations.length === 0) {
      return NextResponse.json({ error: "번역 정보는 필수입니다." }, { status: 400 });
    }

    // 시스템 카테고리인 경우 최소 하나의 번역이 있는지 확인
    if (category.type === 'system') {
      const hasValidTranslation = translations.some((t: { name: string }) => t.name && t.name.trim() !== '');
      if (!hasValidTranslation) {
        return NextResponse.json({ error: "시스템 카테고리는 최소 하나의 이름이 필요합니다." }, { status: 400 });
      }
    }

    // 카테고리 정보 업데이트
    await db.update(categories)
      .set({
        icon: icon || '📦',
        updatedAt: new Date(),
      })
      .where(eq(categories.id, parsedCategoryId));

    // 기존 번역 정보 삭제
    await db.delete(categoryTranslations)
      .where(eq(categoryTranslations.categoryId, parsedCategoryId));

    // 새로운 번역 정보 추가
    for (const translation of translations) {
      if (translation.name && translation.name.trim() !== '') {
        await db.insert(categoryTranslations)
          .values({
            categoryId: parsedCategoryId,
            language: translation.language,
            name: translation.name.trim(),
            createdAt: new Date(),
            updatedAt: new Date(),
          });
      }
    }

    // 업데이트된 카테고리 정보 조회
    const updatedCategory = await db.query.categories.findFirst({
      where: eq(categories.id, parsedCategoryId),
      with: {
        translations: true,
      },
    });
    console.log('[DEBUG] 업데이트된 카테고리:', updatedCategory);

    return NextResponse.json(updatedCategory);
  } catch (error) {
    console.error("[REFRIGERATOR_CATEGORY_UPDATE]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

// DELETE /api/refrigerators/[refrigeratorId]/categories/[categoryId] - 카테고리 삭제
export async function DELETE(
  request: NextRequest,
  context: { params: { refrigeratorId: string; categoryId: string } }
) {
  try {
    const params = await Promise.resolve(context.params);
    const { refrigeratorId, categoryId } = params;
    console.log('[DEBUG] DELETE 카테고리 삭제 시작:', { refrigeratorId, categoryId });
    
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsedRefrigeratorId = parseInt(refrigeratorId);
    const parsedCategoryId = parseInt(categoryId);
    
    if (isNaN(parsedRefrigeratorId) || isNaN(parsedCategoryId)) {
      return NextResponse.json({ error: "유효하지 않은 ID입니다." }, { status: 400 });
    }

    // 내부 API 호출 여부 확인
    const isInternalCall = request.headers.get('x-api-key') === process.env.INTERNAL_API_KEY;
    console.log('[DEBUG] Internal API Call:', isInternalCall);
    console.log('[DEBUG] User ID:', userId);

    // 냉장고 접근 권한 확인
    const refrigerator = await db.query.refrigerators.findFirst({
      where: eq(refrigerators.id, parsedRefrigeratorId),
    });
    console.log('[DEBUG] 조회된 냉장고:', refrigerator);

    if (!refrigerator) {
      return NextResponse.json({ error: "냉장고를 찾을 수 없습니다." }, { status: 404 });
    }

    const isOwner = refrigerator.ownerId === userId;

    // 공유 멤버 권한 확인 (내부 API 호출이 아닌 경우에만)
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

    // 카테고리 정보 조회
    const category = await db.query.categories.findFirst({
      where: eq(categories.id, parsedCategoryId),
    });
    console.log('[DEBUG] 조회된 카테고리:', category);

    if (!category) {
      return NextResponse.json({ error: "카테고리를 찾을 수 없습니다." }, { status: 404 });
    }

    // 시스템 카테고리는 삭제할 수 없음
    if (category.type === 'system') {
      return NextResponse.json({ error: "시스템 카테고리는 삭제할 수 없습니다." }, { status: 400 });
    }

    // 카테고리가 해당 냉장고에 속해있는지 확인
    const refrigeratorCategory = await db.query.refrigeratorCategories.findFirst({
      where: and(
        eq(refrigeratorCategories.refrigeratorId, parsedRefrigeratorId),
        eq(refrigeratorCategories.categoryId, parsedCategoryId)
      ),
    });
    console.log('[DEBUG] 냉장고-카테고리 연결:', refrigeratorCategory);

    if (!refrigeratorCategory) {
      return NextResponse.json({ error: "카테고리를 찾을 수 없습니다." }, { status: 404 });
    }

    // 카테고리가 다른 냉장고에서 사용되는지 확인
    const usageCount = await db.query.refrigeratorCategories.findMany({
      where: eq(refrigeratorCategories.categoryId, parsedCategoryId),
    });
    console.log('[DEBUG] 카테고리 사용 현황:', usageCount);

    // 냉장고-카테고리 연결 삭제
    await db.delete(refrigeratorCategories)
      .where(and(
        eq(refrigeratorCategories.refrigeratorId, parsedRefrigeratorId),
        eq(refrigeratorCategories.categoryId, parsedCategoryId)
      ));

    // 현재 냉장고에서만 사용 중인 경우 카테고리도 삭제
    if (usageCount.length === 1) {
      // 번역 정보 삭제
      await db.delete(categoryTranslations)
        .where(eq(categoryTranslations.categoryId, parsedCategoryId));

      // 카테고리 삭제
      await db.delete(categories)
        .where(eq(categories.id, parsedCategoryId));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[REFRIGERATOR_CATEGORY_DELETE]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
} 