import { db } from '@/lib/db';
import { recipes, sharedRecipes, recipeFavorites } from '@/db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';

async function testSharingAndFavorites() {
  try {
    console.log('테스트 데이터 생성을 시작합니다...');

    // 1. 레시피 생성
    console.log('1. 테스트 레시피 생성 중...');
    const [recipe] = await db.insert(recipes).values({
      title: '테스트 레시피',
      content: '테스트 레시피 내용입니다.',
      ownerId: 'test-user-1',
      isPublic: true,
      type: 'custom',
      favoriteCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    // 2. 레시피 공유
    console.log('2. 레시피 공유 중...');
    await db.insert(sharedRecipes).values({
      recipeId: recipe.id,
      userId: 'test-user-2',
      canView: true,
      createdAt: new Date(),
    });

    // 3. 레시피 좋아요
    console.log('3. 레시피 좋아요 중...');
    await db.insert(recipeFavorites).values({
      recipeId: recipe.id,
      userId: 'test-user-2',
      createdAt: new Date(),
    });

    // 4. 공유된 레시피 조회
    console.log('4. 공유된 레시피 조회 중...');
    const sharedRecipesList = await db.select()
      .from(recipes)
      .innerJoin(sharedRecipes, eq(recipes.id, sharedRecipes.recipeId))
      .where(and(
        eq(sharedRecipes.userId, 'test-user-2'),
        eq(sharedRecipes.canView, true)
      ))
      .orderBy(desc(recipes.createdAt));

    console.log('공유된 레시피:', sharedRecipesList);

    // 5. 좋아요한 레시피 조회
    console.log('5. 좋아요한 레시피 조회 중...');
    const favoriteRecipes = await db.select()
      .from(recipes)
      .innerJoin(recipeFavorites, eq(recipes.id, recipeFavorites.recipeId))
      .where(eq(recipeFavorites.userId, 'test-user-2'))
      .orderBy(desc(recipes.createdAt));

    console.log('좋아요한 레시피:', favoriteRecipes);

    console.log('테스트 데이터 생성이 완료되었습니다.');
  } catch (error) {
    console.error('테스트 데이터 생성 중 오류 발생:', error);
  }
}

testSharingAndFavorites(); 