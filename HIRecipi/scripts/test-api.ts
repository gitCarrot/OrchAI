import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000/api';
const TEST_USER_ID = 'test-user-1';

// 테스트용 헤더
const headers = {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer test_token',  // 테스트용 토큰
  '__clerk_session_id': 'test_session',  // 테스트용 세션 ID
};

async function testAPI() {
  try {
    // 1. 냉장고 API 테스트
    console.log('1. 냉장고 API 테스트');
    
    // 1.1 냉장고 생성
    console.log('\n1.1 냉장고 생성');
    const createRefrigeratorRes = await fetch(`${BASE_URL}/refrigerators`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: '우리집 냉장고',
        type: 'normal',
      }),
    });
    const refrigerator = await createRefrigeratorRes.json();
    console.log('생성된 냉장고:', refrigerator);

    // 1.2 냉장고 조회
    console.log('\n1.2 냉장고 조회');
    const getRefrigeratorRes = await fetch(`${BASE_URL}/refrigerators/${refrigerator.id}`, {
      headers,
    });
    const foundRefrigerator = await getRefrigeratorRes.json();
    console.log('조회된 냉장고:', foundRefrigerator);

    // 2. 레시피 API 테스트
    console.log('\n2. 레시피 API 테스트');
    
    // 2.1 레시피 생성
    console.log('\n2.1 레시피 생성');
    const createRecipeRes = await fetch(`${BASE_URL}/recipes`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: 'API 테스트 레시피',
        content: '맛있는 요리 만드는 방법...',
        type: 'custom',
        isPublic: false,
      }),
    });
    const recipe = await createRecipeRes.json();
    console.log('생성된 레시피:', recipe);

    // 2.2 레시피 공유
    console.log('\n2.2 레시피 공유');
    const shareRecipeRes = await fetch(`${BASE_URL}/recipes/${recipe.id}/share`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        userIds: ['shared-user-1', 'shared-user-2'],
      }),
    });
    const sharedRecipe = await shareRecipeRes.json();
    console.log('공유된 레시피:', sharedRecipe);

    // 2.3 공개 레시피 목록 조회
    console.log('\n2.3 공개 레시피 목록 조회');
    const getPublicRecipesRes = await fetch(`${BASE_URL}/recipes/public?cursor=0&limit=10&sort=favoriteCount&order=desc`);
    const publicRecipes = await getPublicRecipesRes.json();
    console.log('공개 레시피 목록:', publicRecipes);

    // 3. 즐겨찾기 API 테스트
    console.log('\n3. 즐겨찾기 API 테스트');
    
    // 3.1 즐겨찾기 추가
    console.log('\n3.1 즐겨찾기 추가');
    const addFavoriteRes = await fetch(`${BASE_URL}/recipes/${recipe.id}/favorite`, {
      method: 'POST',
      headers,
    });
    const favorite = await addFavoriteRes.json();
    console.log('추가된 즐겨찾기:', favorite);

    // 3.2 즐겨찾기 목록 조회
    console.log('\n3.2 즐겨찾기 목록 조회');
    const getFavoritesRes = await fetch(`${BASE_URL}/recipes/favorites`, {
      headers,
    });
    const favorites = await getFavoritesRes.json();
    console.log('즐겨찾기 목록:', favorites);

    // 4. 재료 API 테스트
    console.log('\n4. 재료 API 테스트');
    
    // 4.1 냉장고에 재료 추가
    console.log('\n4.1 냉장고에 재료 추가');
    const addIngredientsRes = await fetch(`${BASE_URL}/refrigerators/${refrigerator.id}/ingredients`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ingredients: [
          {
            name: '당근',
            category: '채소',
            quantity: 3,
            expiryDate: '2024-02-01',
          },
          {
            name: '우유',
            category: '유제품',
            quantity: 1,
            expiryDate: '2024-01-30',
          },
        ],
      }),
    });
    const addedIngredients = await addIngredientsRes.json();
    console.log('추가된 재료:', addedIngredients);

    // 4.2 냉장고 재료 목록 조회
    console.log('\n4.2 냉장고 재료 목록 조회');
    const getIngredientsRes = await fetch(`${BASE_URL}/refrigerators/${refrigerator.id}/ingredients`, {
      headers,
    });
    const ingredients = await getIngredientsRes.json();
    console.log('재료 목록:', ingredients);

  } catch (error) {
    console.error('에러 발생:', error);
  }
}

testAPI(); 