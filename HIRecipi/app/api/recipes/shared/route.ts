import { clerkClient, getAuth, currentUser } from '@clerk/nextjs/server';
import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/db';
import { recipes, recipeFavorites, recipeTranslations } from '@/db/schema';
import { desc, eq, sql, and } from 'drizzle-orm';
import { getUserId } from '../../refrigerators/utils';
import { Language } from '@/types';

const PAGE_SIZE = 12;

// GET /api/recipes/shared - 공유된 레시피 목록 조회
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get page and language from query params
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const language = (searchParams.get('language') || 'en') as Language;
    const offset = (page - 1) * PAGE_SIZE;

    // 공유된 레시피 목록 조회 (번역 포함)
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
      })
      .from(recipes)
      .leftJoin(
        recipeTranslations,
        and(
          eq(recipes.id, recipeTranslations.recipeId),
          eq(recipeTranslations.language, language as 'ko' | 'en' | 'ja')
        )
      )
      .where(eq(recipes.isPublic, true))
      .orderBy(desc(recipes.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset);

    // 번역이 없는 레시피에 대해 다른 언어의 번역 찾기
    const recipesWithTranslations = await Promise.all(
      result.map(async (item) => {
        // translation이 null이거나 title이 없는 경우
        if (!item.translation || !item.translation.title) {
          // 다른 언어의 번역 찾기
          const translations = await db
            .select()
            .from(recipeTranslations)
            .where(eq(recipeTranslations.recipeId, item.recipe.id))
            .orderBy(sql`CASE 
              WHEN language = 'ko' THEN 1 
              WHEN language = 'en' THEN 2 
              ELSE 3 
            END`)
            .limit(1);

          if (translations.length > 0) {
            return {
              ...item.recipe,
              translation: translations[0],
              isFavorited: item.isFavorited,
            };
          }

          // 번역이 전혀 없는 경우 빈 번역 객체 반환
          return {
            ...item.recipe,
            translation: {
              language: language,
              title: '(No translation)',
              description: null,
              content: '',
            },
            isFavorited: item.isFavorited,
          };
        }

        return {
          ...item.recipe,
          translation: item.translation,
          isFavorited: item.isFavorited,
        };
      })
    );

    // Get total count for pagination
    const [{ count }] = await db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(recipes)
      .where(eq(recipes.isPublic, true));

    return NextResponse.json({
      recipes: recipesWithTranslations,
      pagination: {
        total: count,
        pageSize: PAGE_SIZE,
        currentPage: page,
        totalPages: Math.ceil(count / PAGE_SIZE),
      },
    });
  } catch (error) {
    console.error("[SHARED_RECIPES_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
} 