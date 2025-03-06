import { getAuth, currentUser } from '@clerk/nextjs/server';
import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/db';
import { refrigerators, categories, refrigeratorCategories, categoryTranslations, sharedRefrigerators } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getUserId } from '../../utils';

// 타입 정의
interface CategoryTranslation {
  id: number;
  language: 'ko' | 'en' | 'ja';
  name: string;
}

interface Category {
  id: number;
  type: 'system' | 'custom';
  icon: string | null;
  translations: CategoryTranslation[];
}

interface RefrigeratorCategory {
  id: number;
  refrigeratorId: number;
  category: Category;
}

// GET /api/refrigerators/[refrigeratorId]/categories - 냉장고의 카테고리 목록과 재료 조회
export async function GET(
  request: NextRequest,
  context: { params: { refrigeratorId: string } }
) {
  try {
    const userId  = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { refrigeratorId } = await Promise.resolve(context.params);
    const parsedRefrigeratorId = parseInt(refrigeratorId);
    if (isNaN(parsedRefrigeratorId)) {
      return NextResponse.json({ error: "유효하지 않은 냉장고 ID입니다." }, { status: 400 });
    }

    // 냉장고 접근 권한 확인
    const refrigerator = await db.query.refrigerators.findFirst({
      where: eq(refrigerators.id, parsedRefrigeratorId),
    });

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

      if (!sharedMember || (sharedMember.role === 'viewer' && request.method !== 'GET')) {
        return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 });
      }
    }

    // 냉장고의 카테고리 목록과 재료 조회
    const refrigeratorCategoryList = await db.query.refrigeratorCategories.findMany({
      where: eq(refrigeratorCategories.refrigeratorId, parsedRefrigeratorId),
      with: {
        category: {
          with: {
            translations: true
          }
        },
        ingredients: true
      }
    });

    console.log('[DEBUG] 조회된 카테고리 목록:', refrigeratorCategoryList);

    // 응답 데이터 가공
    const formattedCategories = refrigeratorCategoryList.map((rc: any) => ({
      id: rc.id,
      refrigeratorId: rc.refrigeratorId,
      categoryId: rc.category.id,
      category: {
        id: rc.category.id,
        type: rc.category.type,
        icon: rc.category.icon,
        translations: rc.category.translations
      },
      ingredients: rc.ingredients || []
    }));

    console.log('[DEBUG] 가공된 카테고리 목록:', formattedCategories);

    return NextResponse.json(formattedCategories);
  } catch (error) {
    console.error("[REFRIGERATOR_CATEGORIES_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

// POST /api/refrigerators/[refrigeratorId]/categories - 냉장고에 카테고리 추가
export async function POST(
  request: NextRequest,
  context: { params: { refrigeratorId: string } }
) {
  try {
    const userId  = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { refrigeratorId } = await Promise.resolve(context.params);
    const parsedRefrigeratorId = parseInt(refrigeratorId);
    if (isNaN(parsedRefrigeratorId)) {
      return NextResponse.json({ error: "유효하지 않은 냉장고 ID입니다." }, { status: 400 });
    }

    const json = await request.json();
    const { type, icon, translations } = json;

    if (!type || !translations || translations.length === 0) {
      return NextResponse.json({ error: "필수 정보가 누락되었습니다." }, { status: 400 });
    }

    // 냉장고 접근 권한 확인
    const refrigerator = await db.query.refrigerators.findFirst({
      where: eq(refrigerators.id, parsedRefrigeratorId),
    });

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

    // 새 카테고리 생성
    const [newCategory] = await db.insert(categories)
      .values({
        type,
        icon: icon || '📦',
        userId: type === 'custom' ? userId : null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // 카테고리 번역 정보 추가
    for (const translation of translations) {
      await db.insert(categoryTranslations)
        .values({
          categoryId: newCategory.id,
          language: translation.language,
          name: translation.name,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
    }

    // 냉장고-카테고리 연결
    const [newRefrigeratorCategory] = await db
      .insert(refrigeratorCategories)
      .values({
        refrigeratorId: parsedRefrigeratorId,
        categoryId: newCategory.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // 생성된 카테고리 정보 조회
    const createdCategory = await db.query.refrigeratorCategories.findFirst({
      where: eq(refrigeratorCategories.id, newRefrigeratorCategory.id),
      with: {
        category: {
          with: {
            translations: true,
          },
        },
      },
    });

    return NextResponse.json(createdCategory);
  } catch (error) {
    console.error("[REFRIGERATOR_CATEGORY_CREATE]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

// DELETE /api/refrigerators/[refrigeratorId]/categories/[categoryId] - 냉장고에서 카테고리 제거
export async function DELETE(
  request: NextRequest,
  context: { params: { refrigeratorId: string; categoryId: string } }
) {
  try {
    const userId  = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { refrigeratorId, categoryId } = await Promise.resolve(context.params);
    const parsedRefrigeratorId = parseInt(refrigeratorId);
    const parsedCategoryId = parseInt(categoryId);
    
    if (isNaN(parsedRefrigeratorId) || isNaN(parsedCategoryId)) {
      return NextResponse.json({ error: "유효하지 않은 ID입니다." }, { status: 400 });
    }

    // 냉장고 접근 권한 확인
    const refrigerator = await db.query.refrigerators.findFirst({
      where: eq(refrigerators.id, parsedRefrigeratorId),
    });

    if (!refrigerator) {
      return NextResponse.json({ error: "냉장고를 찾을 수 없습니다." }, { status: 404 });
    }

    if (refrigerator.ownerId !== userId) {
      return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 });
    }

    // 카테고리 제거
    const [deletedCategory] = await db
      .delete(refrigeratorCategories)
      .where(and(
        eq(refrigeratorCategories.refrigeratorId, parsedRefrigeratorId),
        eq(refrigeratorCategories.categoryId, parsedCategoryId)
      ))
      .returning();

    if (!deletedCategory) {
      return NextResponse.json({ error: "카테고리를 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json(deletedCategory);
  } catch (error) {
    console.error("[REFRIGERATOR_CATEGORY_DELETE]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
} 