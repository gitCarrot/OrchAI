import { getAuth } from '@clerk/nextjs/server';
import { NextResponse, NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { recipes, recipeTags, recipeTranslations, tags, recipeFavorites, tagTranslations } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getUserId } from '../../refrigerators/utils';

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;




// 레시피 수정 스키마
const updateRecipeSchema = z.object({
  translations: z.array(z.object({
    language: z.enum(['ko', 'en', 'ja']),
    title: z.string(),
    description: z.string().optional(),
    content: z.string()
  })),
  isPublic: z.boolean(),
  tags: z.array(z.string())
});

// GET /api/recipes/[recipeId] - 레시피 상세 조회
export async function GET(
  request: NextRequest,
  context: { params: { recipeId: string } }
) {
  try {
    const { userId } = await getAuth(request);
    const { recipeId } = await Promise.resolve(context.params);
    const recipeIdNum = parseInt(recipeId);

    // URL에서 language 파라미터 추출
    const { searchParams } = new URL(request.url);
    const language = searchParams.get('language') || 'ko';

    if (isNaN(recipeIdNum)) {
      return NextResponse.json({ error: "Invalid recipe ID" }, { status: 400 });
    }

    // 레시피 기본 정보와 현재 언어의 번역만 조회
    const result = await db
      .select({
        recipe: {
          id: recipes.id,
          type: recipes.type,
          isPublic: recipes.isPublic,
          favoriteCount: recipes.favoriteCount,
          createdAt: recipes.createdAt,
          ownerId: recipes.ownerId,
        },
        translation: recipeTranslations,
        tags: tags,
        tagTranslations: tagTranslations,
      })
      .from(recipes)
      .leftJoin(
        recipeTranslations,
        and(
          eq(recipeTranslations.recipeId, recipes.id),
          eq(recipeTranslations.language, language as 'ko' | 'en' | 'ja')
        )
      )
      .leftJoin(
        recipeTags,
        eq(recipes.id, recipeTags.recipeId)
      )
      .leftJoin(
        tags,
        eq(recipeTags.tagId, tags.id)
      )
      .leftJoin(
        tagTranslations,
        and(
          eq(tagTranslations.tagId, tags.id),
          eq(tagTranslations.language, language as 'ko' | 'en' | 'ja')
        )
      )
      .where(eq(recipes.id, recipeIdNum));

    if (result.length === 0) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    // 즐겨찾기 상태 확인
    const favorite = userId ? await db
      .select()
      .from(recipeFavorites)
      .where(
        and(
          eq(recipeFavorites.recipeId, recipeIdNum),
          eq(recipeFavorites.userId, userId)
        )
      )
      .limit(1) : [];

    // 태그 정보 정리
    const uniqueTags = Array.from(new Set(result.map(r => r.tags?.id)))
      .filter(Boolean)
      .map(tagId => {
        const tagData = result.find(r => r.tags?.id === tagId);
        return {
          id: tagId,
          name: tagData?.tags?.name,
          translation: {
            language,
            name: tagData?.tagTranslations?.name || tagData?.tags?.name
          }
        };
      });

    // 응답 데이터 구성
    const response = {
      ...result[0].recipe,
      translation: result[0].translation || null,
      tags: uniqueTags,
      isFavorited: favorite.length > 0
    };

    if (!response.translation) {
      // 현재 언어의 번역이 없는 경우, 다른 언어의 번역을 찾음
      const allTranslations = await db
        .select()
        .from(recipeTranslations)
        .where(eq(recipeTranslations.recipeId, recipeIdNum))
        .limit(1);

      if (allTranslations.length > 0) {
        response.translation = allTranslations[0];
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("[RECIPE_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

// PATCH /api/recipes/[recipeId] - 레시피 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: { recipeId: string } }
) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { recipeId } = await Promise.resolve(params);
    const recipeIdNum = parseInt(recipeId);
    if (isNaN(recipeIdNum)) {
      return NextResponse.json({ error: "Invalid recipe ID" }, { status: 400 });
    }

    // 레시피 존재 및 소유권 확인
    const existingRecipe = await db.query.recipes.findFirst({
      where: eq(recipes.id, recipeIdNum),
    });

    if (!existingRecipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    if (existingRecipe.ownerId !== userId) {
      return NextResponse.json({ error: "Not authorized to edit this recipe" }, { status: 403 });
    }

    // 요청 데이터 검증
    const body = await request.json();
    const validatedData = updateRecipeSchema.safeParse(body);
    
    if (!validatedData.success) {
      return NextResponse.json({ 
        error: "Invalid request data",
        details: validatedData.error.format()
      }, { status: 400 });
    }

    const { translations, isPublic, tags: tagNames } = validatedData.data;
    
    // 현재 언어의 번역만 가져오기
    const currentTranslation = translations[0];
    if (!currentTranslation) {
      return NextResponse.json({ error: "Translation is required" }, { status: 400 });
    }

    // 트랜잭션으로 모든 업데이트 수행
    await db.transaction(async (tx) => {
      // 1. 레시피 기본 정보 업데이트
      await tx
        .update(recipes)
        .set({
          isPublic,
          updatedAt: new Date(),
        })
        .where(eq(recipes.id, recipeId));

      // 2. 현재 언어의 번역 업데이트 또는 생성
      const existingTranslation = await tx.query.recipeTranslations.findFirst({
        where: and(
          eq(recipeTranslations.recipeId, recipeId),
          eq(recipeTranslations.language, currentTranslation.language)
        ),
      });

      if (existingTranslation) {
        // 기존 번역 업데이트
        await tx
          .update(recipeTranslations)
          .set({
            title: currentTranslation.title,
            description: currentTranslation.description || null,
            content: currentTranslation.content,
            updatedAt: new Date(),
          })
          .where(and(
            eq(recipeTranslations.recipeId, recipeId),
            eq(recipeTranslations.language, currentTranslation.language)
          ));
      } else {
        // 새 번역 추가
        await tx.insert(recipeTranslations).values({
          recipeId,
          language: currentTranslation.language,
          title: currentTranslation.title,
          description: currentTranslation.description || null,
          content: currentTranslation.content,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // 3. 기존 태그 연결 삭제
      await tx
        .delete(recipeTags)
        .where(eq(recipeTags.recipeId, recipeId));

      // 4. 새 태그 처리
      if (tagNames.length > 0) {
        // 기존 태그 조회 또는 새 태그 생성
        const tagPromises = tagNames.map(async (tagName) => {
          let tag = await tx.query.tags.findFirst({
            where: eq(tags.name, tagName),
          });

          if (!tag) {
            const [newTag] = await tx
              .insert(tags)
              .values({
                name: tagName,
                createdAt: new Date(),
                updatedAt: new Date(),
              })
              .returning();
            tag = newTag;
          }

          return tag;
        });

        const resolvedTags = await Promise.all(tagPromises);

        // 태그 연결
        await tx.insert(recipeTags).values(
          resolvedTags.map(tag => ({
            recipeId,
            tagId: tag.id,
            createdAt: new Date(),
            updatedAt: new Date(),
          }))
        );
      }
    });

    return NextResponse.json({ message: "Recipe updated successfully" });
  } catch (error) {
    console.error("[RECIPE_PATCH]", error);
    return NextResponse.json({ error: "Failed to update recipe" }, { status: 500 });
  }
}

// DELETE /api/recipes/[recipeId] - 레시피 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { recipeId: string } }
) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { recipeId } = await Promise.resolve(params);
    const recipeIdNum = parseInt(recipeId);
    if (isNaN(recipeIdNum)) {
      return NextResponse.json({ error: "Invalid recipe ID" }, { status: 400 });
    }

    // 레시피 존재 및 권한 확인
    const existingRecipe = await db.query.recipes.findFirst({
      where: and(
        eq(recipes.id, recipeIdNum),
        eq(recipes.ownerId, userId)
      ),
    });

    if (!existingRecipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    // 트랜잭션으로 레시피와 관련 데이터 삭제
    await db.transaction(async (tx) => {
      // 1. 레시피 번역 데이터 삭제
      await tx.delete(recipeTranslations)
        .where(eq(recipeTranslations.recipeId, recipeIdNum));

      // 2. 레시피-태그 연결 삭제
      await tx.delete(recipeTags)
        .where(eq(recipeTags.recipeId, recipeIdNum));

      // 3. 레시피 삭제
      await tx.delete(recipes)
        .where(eq(recipes.id, recipeIdNum));
    });

    return NextResponse.json({ message: "Recipe deleted successfully" });
  } catch (error) {
    console.error("[RECIPES_DELETE]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

// PUT /api/recipes/[recipeId] - 레시피 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: { recipeId: string } }
) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { recipeId } = await Promise.resolve(params);
    const recipeIdNum = parseInt(recipeId);
    if (isNaN(recipeIdNum)) {
      return NextResponse.json({ error: "Invalid recipe ID" }, { status: 400 });
    }

    // 레시피 존재 및 권한 확인
    const existingRecipe = await db.query.recipes.findFirst({
      where: and(
        eq(recipes.id, recipeIdNum),
        eq(recipes.ownerId, userId)
      ),
    });

    if (!existingRecipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    // 요청 데이터 검증
    const body = await request.json();
    const validatedData = updateRecipeSchema.safeParse(body);
    
    if (!validatedData.success) {
      return NextResponse.json({ 
        error: "Invalid request data",
        details: validatedData.error.format()
      }, { status: 400 });
    }

    const { translations, isPublic, tags: tagNames } = validatedData.data;
    
    // 현재 언어의 번역만 가져오기
    const currentTranslation = translations[0];
    if (!currentTranslation) {
      return NextResponse.json({ error: "Translation is required" }, { status: 400 });
    }

    // 트랜잭션으로 모든 업데이트 수행
    await db.transaction(async (tx) => {
      // 1. 레시피 기본 정보 업데이트
      await tx
        .update(recipes)
        .set({
          isPublic,
          updatedAt: new Date(),
        })
        .where(eq(recipes.id, recipeId));

      // 2. 현재 언어의 번역 업데이트 또는 생성
      const existingTranslation = await tx.query.recipeTranslations.findFirst({
        where: and(
          eq(recipeTranslations.recipeId, recipeId),
          eq(recipeTranslations.language, currentTranslation.language)
        ),
      });

      if (existingTranslation) {
        // 기존 번역 업데이트
        await tx
          .update(recipeTranslations)
          .set({
            title: currentTranslation.title,
            description: currentTranslation.description || null,
            content: currentTranslation.content,
            updatedAt: new Date(),
          })
          .where(and(
            eq(recipeTranslations.recipeId, recipeId),
            eq(recipeTranslations.language, currentTranslation.language)
          ));
      } else {
        // 새 번역 추가
        await tx.insert(recipeTranslations).values({
          recipeId,
          language: currentTranslation.language,
          title: currentTranslation.title,
          description: currentTranslation.description || null,
          content: currentTranslation.content,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // 3. 기존 태그 연결 삭제
      await tx
        .delete(recipeTags)
        .where(eq(recipeTags.recipeId, recipeId));

      // 4. 새 태그 처리
      if (tagNames.length > 0) {
        // 기존 태그 조회 또는 새 태그 생성
        const tagPromises = tagNames.map(async (tagName) => {
          let tag = await tx.query.tags.findFirst({
            where: eq(tags.name, tagName),
          });

          if (!tag) {
            const [newTag] = await tx
              .insert(tags)
              .values({
                name: tagName,
                createdAt: new Date(),
                updatedAt: new Date(),
              })
              .returning();
            tag = newTag;
          }

          return tag;
        });

        const resolvedTags = await Promise.all(tagPromises);

        // 태그 연결
        await tx.insert(recipeTags).values(
          resolvedTags.map(tag => ({
            recipeId,
            tagId: tag.id,
            createdAt: new Date(),
            updatedAt: new Date(),
          }))
        );
      }
    });

    return NextResponse.json({ message: "Recipe updated successfully" });
  } catch (error) {
    console.error("[RECIPE_PUT]", error);
    return NextResponse.json({ error: "Failed to update recipe" }, { status: 500 });
  }
} 