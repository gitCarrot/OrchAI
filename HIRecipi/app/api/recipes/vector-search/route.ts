import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/db';
import { recipes, recipeFavorites, recipeTranslations } from '@/db/schema';
import { desc, eq, sql, and } from 'drizzle-orm';
import { getUserId } from '../../refrigerators/utils';
import OpenAI from 'openai';
import { Language } from '@/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 텍스트를 임베딩 벡터로 변환하는 함수
async function getEmbedding(text: string) {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return response.data[0].embedding;
}

// POST /api/recipes/vector-search - 벡터 기반 레시피 검색
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get search params from request body
    const { searchParams } = new URL(request.url);
    const language = (searchParams.get('language') || 'ko') as Language;
    const body = await request.json();
    const { keyword } = body;

    if (!keyword?.trim()) {
      return NextResponse.json({ error: "검색어를 입력해주세요." }, { status: 400 });
    }

    // 검색어의 임베딩 생성
    const searchEmbedding = await getEmbedding(keyword);

    // 유사도 검색 쿼리 (현재 언어의 번역이 있는 레시피 검색)
    const result = await db
      .select({
        recipe: {
          id: recipes.id,
          type: recipes.type,
          isPublic: recipes.isPublic,
          favoriteCount: recipes.favoriteCount,
          createdAt: recipes.createdAt,
          ownerId: recipes.ownerId,
          embedding: recipes.embedding,
        },
        translation: {
          language: recipeTranslations.language,
          title: recipeTranslations.title,
          description: recipeTranslations.description,
          content: recipeTranslations.content,
        },
        isFavorited: sql<boolean>`
          EXISTS (
            SELECT 1 FROM ${recipeFavorites}
            WHERE ${recipeFavorites.recipeId} = ${recipes.id}
            AND ${recipeFavorites.userId} = ${userId}
          )
        `,
        similarity: sql<number>`1 - (${recipes.embedding} <=> ${searchEmbedding}::vector)`,
      })
      .from(recipes)
      .leftJoin(
        recipeTranslations,
        and(
          eq(recipes.id, recipeTranslations.recipeId),
          eq(recipeTranslations.language, language)
        )
      )
      .where(eq(recipes.isPublic, true))
      .orderBy(sql`similarity DESC`)
      .limit(20);

    // 검색 결과가 없는 경우 모든 언어에서 검색
    if (result.length === 0) {
      const fallbackResult = await db
        .select({
          recipe: {
            id: recipes.id,
            type: recipes.type,
            isPublic: recipes.isPublic,
            favoriteCount: recipes.favoriteCount,
            createdAt: recipes.createdAt,
            ownerId: recipes.ownerId,
            embedding: recipes.embedding,
          },
          translation: {
            language: recipeTranslations.language,
            title: recipeTranslations.title,
            description: recipeTranslations.description,
            content: recipeTranslations.content,
          },
          isFavorited: sql<boolean>`
            EXISTS (
              SELECT 1 FROM ${recipeFavorites}
              WHERE ${recipeFavorites.recipeId} = ${recipes.id}
              AND ${recipeFavorites.userId} = ${userId}
            )
          `,
          similarity: sql<number>`1 - (${recipes.embedding} <=> ${searchEmbedding}::vector)`,
        })
        .from(recipes)
        .leftJoin(
          recipeTranslations,
          eq(recipes.id, recipeTranslations.recipeId)
        )
        .where(eq(recipes.isPublic, true))
        .orderBy(sql`similarity DESC`)
        .limit(20);

      // 검색된 레시피들의 현재 언어 번역 가져오기
      const recipesWithTranslations = await Promise.all(
        fallbackResult.map(async (item) => {
          const translations = await db
            .select()
            .from(recipeTranslations)
            .where(
              and(
                eq(recipeTranslations.recipeId, item.recipe.id),
                eq(recipeTranslations.language, language)
              )
            )
            .limit(1);

          if (translations.length > 0) {
            return {
              ...item.recipe,
              translation: translations[0],
              isFavorited: item.isFavorited,
              similarity: item.similarity,
            };
          }

          // 현재 언어 번역이 없는 경우 검색된 번역 사용
          return {
            ...item.recipe,
            translation: item.translation || {
              language,
              title: '(No translation)',
              description: null,
              content: '',
            },
            isFavorited: item.isFavorited,
            similarity: item.similarity,
          };
        })
      );

      return NextResponse.json({
        recipes: recipesWithTranslations,
        total: recipesWithTranslations.length,
      });
    }

    // 현재 언어로 검색된 결과 반환
    const recipesWithTranslations = result.map(item => ({
      ...item.recipe,
      translation: item.translation || {
        language,
        title: '(No translation)',
        description: null,
        content: '',
      },
      isFavorited: item.isFavorited,
      similarity: item.similarity,
    }));

    return NextResponse.json({
      recipes: recipesWithTranslations,
      total: recipesWithTranslations.length,
    });
  } catch (error) {
    console.error("[VECTOR_SEARCH]", error);
    return NextResponse.json(
      { error: "레시피 검색 중 오류가 발생했습니다.", recipes: [] },
      { status: 500 }
    );
  }
} 