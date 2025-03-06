import { db } from '@/db';
import { recipes, ingredients, recipeIngredients, refrigerators } from '@/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
  try {
    console.log('테스트 데이터 생성을 시작합니다...');

    // 1. 냉장고 생성
    console.log('1. 테스트 냉장고 생성 중...');
    const [refrigerator] = await db.insert(refrigerators).values({
      ownerId: 'test-user-1',
      name: '우리집 냉장고',
      description: '주방에 있는 메인 냉장고',
    }).returning();
    console.log('생성된 냉장고:', refrigerator);

    // 2. 재료 생성
    console.log('\n2. 테스트 재료 생성 중...');
    const ingredientsData = [
      {
        name: '우유',
        categoryId: 1,
        unit: 'ml',
        refrigeratorId: refrigerator.id,
      },
      {
        name: '계란',
        categoryId: 1,
        unit: '개',
        refrigeratorId: refrigerator.id,
      },
      {
        name: '당근',
        categoryId: 2,
        unit: '개',
        refrigeratorId: refrigerator.id,
      },
    ];

    const createdIngredients = await db.insert(ingredients)
      .values(ingredientsData)
      .returning();

    console.log('생성된 재료들:', createdIngredients);

    // 3. 레시피 생성
    console.log('\n3. 테스트 레시피 생성 중...');
    const [recipe] = await db.insert(recipes).values({
      ownerId: 'test-user-1',
      type: 'custom',
      title: '테스트 레시피',
      content: '맛있는 테스트 요리 만드는 방법',
      isPublic: true,
      favoriteCount: 0,
    }).returning();
    console.log('생성된 레시피:', recipe);

    // 4. 레시피에 재료 연결
    console.log('\n4. 레시피에 재료 추가 중...');
    const [recipeIngredient] = await db.insert(recipeIngredients).values({
      recipeId: recipe.id,
      ingredientId: createdIngredients[0].id,
      quantity: 2,
      unit: '개',
    }).returning();
    console.log('레시피-재료 연결:', recipeIngredient);

    // 5. 냉장고 조회 (재료 포함)
    console.log('\n5. 냉장고 조회 중...');
    const foundRefrigerator = await db.query.refrigerators.findFirst({
      where: eq(refrigerators.id, refrigerator.id),
      with: {
        ingredients: true,
      },
    });
    console.log('조회된 냉장고:', foundRefrigerator);

    console.log('\n테스트 데이터 생성이 완료되었습니다.');
  } catch (error) {
    console.error('테스트 데이터 생성 중 오류 발생:', error);
    process.exit(1);
  }

  process.exit(0);
}

main(); 