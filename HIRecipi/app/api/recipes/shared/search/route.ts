import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/db';
import { recipes, recipeFavorites, recipeTranslations, tags, tagTranslations, recipeTags } from '@/db/schema';
import { desc, eq, sql, and, or, ilike } from 'drizzle-orm';
import { getUserId } from '../../../refrigerators/utils';
import { z } from 'zod';
import { Language } from '@/types';

// 검색 파라미터 스키마
const searchParamsSchema = z.object({
  keyword: z.string().min(1, "검색어를 입력해주세요."),
  language: z.enum(['ko', 'en', 'ja']).default('ko'),
});

// POST /api/recipes/shared/search - 공유된 레시피 검색
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

    // 키워드로 레시피 검색 (제목, 내용, 설명, 태그에서 검색)
    const searchQuery = db
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
        tagName: tagTranslations.name,
      })
      .from(recipes)
      .leftJoin(
        recipeTranslations,
        and(
          eq(recipes.id, recipeTranslations.recipeId),
          eq(recipeTranslations.language, language)
        )
      )
      // 태그 정보 조인
      .leftJoin(
        recipeTags,
        eq(recipeTags.recipeId, recipes.id)
      )
      .leftJoin(
        tags,
        eq(recipeTags.tagId, tags.id)
      )
      .leftJoin(
        tagTranslations,
        and(
          eq(tagTranslations.tagId, tags.id),
          eq(tagTranslations.language, language)
        )
      );

    const result = await searchQuery
      .where(
        and(
          eq(recipes.isPublic, true),
          or(
            ilike(recipeTranslations.title, `%${keyword}%`),
            ilike(recipeTranslations.content, `%${keyword}%`),
            ilike(recipeTranslations.description || '', `%${keyword}%`),
            // 태그 이름에서도 검색
            ilike(tagTranslations.name, `%${keyword}%`)
          )
        )
      )
      .orderBy(desc(recipes.createdAt));

    // 중복 제거 (태그 조인으로 인해 중복된 레시피가 있을 수 있음)
    const uniqueRecipeIds = new Set();
    const uniqueResults = result.filter(item => {
      if (uniqueRecipeIds.has(item.recipe.id)) {
        return false;
      }
      uniqueRecipeIds.add(item.recipe.id);
      return true;
    });

    // 검색 결과가 없는 경우 다른 언어에서도 검색
    if (uniqueResults.length === 0) {
      const fallbackQuery = db
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
          tagName: tagTranslations.name,
        })
        .from(recipes)
        .leftJoin(
          recipeTranslations,
          eq(recipes.id, recipeTranslations.recipeId)
        )
        // 태그 정보 조인 (모든 언어)
        .leftJoin(
          recipeTags,
          eq(recipeTags.recipeId, recipes.id)
        )
        .leftJoin(
          tags,
          eq(recipeTags.tagId, tags.id)
        )
        .leftJoin(
          tagTranslations,
          eq(tagTranslations.tagId, tags.id)
        );

      const fallbackResult = await fallbackQuery
        .where(
          and(
            eq(recipes.isPublic, true),
            or(
              ilike(recipeTranslations.title, `%${keyword}%`),
              ilike(recipeTranslations.content, `%${keyword}%`),
              ilike(recipeTranslations.description || '', `%${keyword}%`),
              // 태그 이름에서도 검색
              ilike(tagTranslations.name, `%${keyword}%`)
            )
          )
        )
        .orderBy(desc(recipes.createdAt));

      // 중복 제거
      const uniqueFallbackIds = new Set();
      const uniqueFallbackResults = fallbackResult.filter(item => {
        if (uniqueFallbackIds.has(item.recipe.id)) {
          return false;
        }
        uniqueFallbackIds.add(item.recipe.id);
        return true;
      });

      // 검색된 레시피들의 현재 언어 번역 가져오기
      const recipesWithTranslations = await Promise.all(
        uniqueFallbackResults.map(async (item) => {
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
          };
        })
      );

      return NextResponse.json({
        recipes: recipesWithTranslations,
        total: recipesWithTranslations.length,
      });
    }

    // 현재 언어로 검색된 결과 반환
    const recipesWithTranslations = uniqueResults.map(item => ({
      ...item.recipe,
      translation: item.translation || {
        language,
        title: '(No translation)',
        description: null,
        content: '',
      },
      isFavorited: item.isFavorited,
    }));

    return NextResponse.json({
      recipes: recipesWithTranslations,
      total: recipesWithTranslations.length,
    });
  } catch (error) {
    console.error("[SHARED_RECIPES_SEARCH]", error);
    return NextResponse.json(
      { error: "레시피 검색 중 오류가 발생했습니다.", recipes: [] },
      { status: 500 }
    );
  }
} 