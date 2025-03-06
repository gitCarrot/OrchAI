import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/db';
import { categories, refrigeratorCategories, categoryTranslations, refrigerators } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getUserId } from '../../../utils';
import { z } from 'zod';

// 배치 카테고리 생성 스키마
const batchCreateSchema = z.object({
  categories: z.array(z.object({
    type: z.enum(["custom", "system"]),
    icon: z.string().optional(),
    translations: z.array(z.object({
      language: z.string(),
      name: z.string()
    }))
  }))
});

// POST /api/refrigerators/[refrigeratorId]/categories/batch - 여러 카테고리 한 번에 추가
export async function POST(
  request: NextRequest,
  context: { params: { refrigeratorId: string } }
) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { refrigeratorId } = await Promise.resolve(context.params);
    const parsedRefrigeratorId = parseInt(refrigeratorId);
    if (isNaN(parsedRefrigeratorId)) {
      return NextResponse.json({ error: "유효하지 않은 냉장고 ID입니다." }, { status: 400 });
    }

    const json = await request.json();
    const { categories: categoryList } = batchCreateSchema.parse(json);

    // 냉장고 접근 권한 확인
    const refrigerator = await db.query.refrigerators.findFirst({
      where: eq(refrigerators.id, parsedRefrigeratorId),
    });

    if (!refrigerator) {
      return NextResponse.json({ error: "냉장고를 찾을 수 없습니다." }, { status: 404 });
    }

    const isOwner = refrigerator.ownerId === userId;
    if (!isOwner) {
      return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 });
    }

    // 여러 카테고리 생성
    const createdCategories = [];
    for (const categoryData of categoryList) {
      // 새 카테고리 생성
      const [newCategory] = await db.insert(categories)
        .values({
          type: categoryData.type,
          icon: categoryData.icon || '📦',
          userId: categoryData.type === 'custom' ? userId : null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // 카테고리 번역 정보 추가
      for (const translation of categoryData.translations) {
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

      if (createdCategory) {
        createdCategories.push(createdCategory);
      }
    }

    return NextResponse.json(createdCategories, { status: 201 });
  } catch (error) {
    console.error("[REFRIGERATOR_CATEGORIES_BATCH_CREATE]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
} 