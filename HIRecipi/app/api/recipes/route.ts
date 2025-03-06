import { getAuth } from '@clerk/nextjs/server';
import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/db';
import { recipes, recipeTags, recipeTranslations, tags, tagTranslations, recipesRelations } from '@/db/schema';
import { desc, eq, sql, and, inArray } from 'drizzle-orm';
import { z } from 'zod';
import OpenAI from 'openai';

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 사용자 ID 확인 함수
async function getUserId(request: NextRequest): Promise<string | null> {
  const apiKey = request.headers.get('x-api-key');
  const targetUserId = request.headers.get('x-user-id');

  if (apiKey && INTERNAL_API_KEY && apiKey === INTERNAL_API_KEY && targetUserId) {
    return targetUserId;
  }

  const { userId } = await getAuth(request);
  return userId;
}

// 태그 번역 스키마
const tagTranslationSchema = z.object({
  language: z.enum(['ko', 'en', 'ja']),
  name: z.string().min(1, "태그 이름은 필수입니다."),
});

// 레시피 번역 스키마
const translationSchema = z.object({
  language: z.enum(['ko', 'en', 'ja']),
  title: z.string().min(1, "제목은 필수입니다."),
  description: z.string().optional(),
  content: z.string().min(1, "내용은 필수입니다."),
});

// 태그 스키마
const tagSchema = z.object({
  name: z.string().min(1, "태그 이름은 필수입니다."),
  translations: z.array(tagTranslationSchema).min(1, "최소 하나의 번역이 필요합니다."),
});

// 레시피 생성 스키마
const createRecipeSchema = z.object({
  type: z.enum(["custom", "ai"]).default("custom"),
  isPublic: z.boolean().default(false),
  translations: z.array(translationSchema).min(1, "최소 하나의 번역이 필요합니다."),
  tags: z.array(tagSchema).optional(),
});

// GET /api/recipes - 내 레시피 목록 조회
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRecipes = await db.query.recipes.findMany({
      where: eq(recipes.ownerId, userId),
      with: {
        translations: true,
        tags: {
          with: {
            tag: {
              with: {
                translations: true
              }
            }
          }
        }
      },
      orderBy: [desc(recipes.createdAt)],
    });

    return NextResponse.json(userRecipes);
  } catch (error) {
    console.error("[RECIPES_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

// 텍스트를 임베딩 벡터로 변환하는 함수
async function getEmbedding(text: string) {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return response.data[0].embedding;
}

// POST /api/recipes - 레시피 생성
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createRecipeSchema.safeParse(body);
    
    if (!validatedData.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validatedData.error.format() },
        { status: 400 }
      );
    }

    const { type, isPublic, translations, tags: newTags = [] } = validatedData.data;

    // 임베딩 생성을 위한 텍스트 준비
    const embeddingText = translations.map(t => 
      `${t.title} ${t.description || ''} ${t.content}`
    ).join(' ');

    // 임베딩 생성
    const embedding = await getEmbedding(embeddingText);

    // 트랜잭션으로 레시피, 번역, 태그 데이터 저장
    const [recipe] = await db.transaction(async (tx) => {
      // 1. 레시피 생성
      const [newRecipe] = await tx.insert(recipes)
        .values({
          type,
          isPublic,
          ownerId: userId,
          embedding,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // 2. 레시피 번역 데이터 저장
      await Promise.all(translations.map(translation =>
        tx.insert(recipeTranslations)
          .values({
            recipeId: newRecipe.id,
            language: translation.language,
            title: translation.title,
            description: translation.description || null,
            content: translation.content,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
      ));

      // 3. 태그 처리
      if (newTags.length > 0) {
        for (const tagData of newTags) {
          // 3.1 태그 생성 또는 조회
          let tag = await tx.query.tags.findFirst({
            where: eq(tags.name, tagData.name),
          });

          if (!tag) {
            const [newTag] = await tx.insert(tags)
              .values({
                name: tagData.name,
                createdAt: new Date(),
                updatedAt: new Date(),
              })
              .returning();
            tag = newTag;

            // 3.2 태그 번역 데이터 저장
            await Promise.all(tagData.translations.map(translation =>
              tx.insert(tagTranslations)
                .values({
                  tagId: tag!.id,
                  language: translation.language,
                  name: translation.name,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                })
            ));
          }

          // 3.3 레시피-태그 연결
          await tx.insert(recipeTags)
            .values({
              recipeId: newRecipe.id,
              tagId: tag.id,
              createdAt: new Date(),
            });
        }
      }

      return [newRecipe];
    });

    // 생성된 레시피와 관련 데이터 조회
    const createdRecipe = await db.query.recipes.findFirst({
      where: eq(recipes.id, recipe.id),
      with: {
        translations: true,
        tags: {
          with: {
            tag: {
              with: {
                translations: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json(createdRecipe);
  } catch (error) {
    console.error("[RECIPES_POST]", error);
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

    const body = await request.json();
    const validatedData = createRecipeSchema.safeParse(body);
    
    if (!validatedData.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validatedData.error.format() },
        { status: 400 }
      );
    }

    const { type, isPublic, translations, tags: newTags = [] } = validatedData.data;
    const recipeId = parseInt(params.recipeId);

    if (isNaN(recipeId)) {
      return NextResponse.json({ error: "Invalid recipe ID" }, { status: 400 });
    }

    // 레시피 존재 및 권한 확인
    const existingRecipe = await db.query.recipes.findFirst({
      where: and(
        eq(recipes.id, recipeId),
        eq(recipes.ownerId, userId)
      ),
    });

    if (!existingRecipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    // 임베딩 생성을 위한 텍스트 준비
    const embeddingText = translations.map(t => 
      `${t.title} ${t.description || ''} ${t.content}`
    ).join(' ');

    // 임베딩 생성
    const embedding = await getEmbedding(embeddingText);

    // 트랜잭션으로 레시피, 번역, 태그 데이터 업데이트
    const [updatedRecipe] = await db.transaction(async (tx) => {
      // 1. 레시피 정보 업데이트
      const [recipe] = await tx.update(recipes)
        .set({
          type,
          isPublic,
          embedding,
          updatedAt: new Date(),
        })
        .where(eq(recipes.id, recipeId))
        .returning();

      // 2. 기존 번역 데이터 삭제 후 새로운 번역 추가
      await tx.delete(recipeTranslations)
        .where(eq(recipeTranslations.recipeId, recipeId));

      await Promise.all(translations.map(translation =>
        tx.insert(recipeTranslations)
          .values({
            recipeId,
            language: translation.language,
            title: translation.title,
            description: translation.description || null,
            content: translation.content,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
      ));

      // 3. 기존 태그 연결 삭제
      await tx.delete(recipeTags)
        .where(eq(recipeTags.recipeId, recipeId));

      // 4. 새로운 태그 처리
      if (newTags.length > 0) {
        for (const tagData of newTags) {
          // 4.1 태그 생성 또는 조회
          let tag = await tx.query.tags.findFirst({
            where: eq(tags.name, tagData.name),
          });

          if (!tag) {
            const [newTag] = await tx.insert(tags)
              .values({
                name: tagData.name,
                createdAt: new Date(),
                updatedAt: new Date(),
              })
              .returning();
            tag = newTag;

            // 4.2 태그 번역 데이터 저장
            await Promise.all(tagData.translations.map(translation =>
              tx.insert(tagTranslations)
                .values({
                  tagId: tag!.id,
                  language: translation.language,
                  name: translation.name,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                })
            ));
          }

          // 4.3 레시피-태그 연결
          await tx.insert(recipeTags)
            .values({
              recipeId,
              tagId: tag.id,
              createdAt: new Date(),
            });
        }
      }

      return [recipe];
    });

    // 업데이트된 레시피와 관련 데이터 조회
    const updatedRecipeWithDetails = await db.query.recipes.findFirst({
      where: eq(recipes.id, recipeId),
      with: {
        translations: true,
        tags: {
          with: {
            tag: {
              with: {
                translations: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json(updatedRecipeWithDetails);
  } catch (error) {
    console.error("[RECIPES_PUT]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
} 