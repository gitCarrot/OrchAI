import { auth, currentUser } from '@clerk/nextjs';
import { NextRequest } from 'next/server';
import { POST as ADD_INGREDIENT } from '@/app/api/refrigerators/[refrigeratorId]/ingredients/route';
import { GET as GET_INGREDIENTS } from '@/app/api/refrigerators/[refrigeratorId]/ingredients/route';
import { PATCH as UPDATE_INGREDIENT } from '@/app/api/refrigerators/[refrigeratorId]/ingredients/[ingredientId]/route';
import { DELETE as DELETE_INGREDIENT } from '@/app/api/refrigerators/[refrigeratorId]/ingredients/[ingredientId]/route';
import { db } from '@/db';
import { refrigerators, ingredients, refrigeratorIngredients } from '@/db/schema';

// Clerk 인증 모킹
jest.mock('@clerk/nextjs', () => ({
  auth: jest.fn(async () => ({ userId: 'test_user_id' })),
  currentUser: jest.fn(async () => ({
    id: 'test_user_id',
    emailAddresses: [{ emailAddress: 'test@example.com' }],
  })),
}));

describe('냉장고 재료 API 테스트', () => {
  const testUserId = 'test_user_id';
  const testUserEmail = 'test@example.com';

  beforeEach(() => {
    // 기본 모킹 값 설정
    (auth as jest.Mock).mockImplementation(async () => ({
      userId: testUserId,
    }));

    (currentUser as jest.Mock).mockImplementation(async () => ({
      id: testUserId,
      emailAddresses: [{ emailAddress: testUserEmail }],
    }));
  });

  afterEach(async () => {
    await db.delete(refrigeratorIngredients);
    await db.delete(ingredients);
    await db.delete(refrigerators);
    jest.clearAllMocks();
  });

  describe('POST /api/refrigerators/[refrigeratorId]/ingredients', () => {
    it('냉장고에 재료를 추가할 수 있다', async () => {
      // 테스트 냉장고 생성
      const [testRefrigerator] = await db
        .insert(refrigerators)
        .values({
          name: '테스트 냉장고',
          ownerId: testUserId,
          type: 'normal',
          isShared: false,
        })
        .returning();

      const ingredient = {
        name: '당근',
        category: '채소',
        quantity: 3,
        unit: '개',
        expiryDate: new Date('2024-12-31').toISOString(),
      };

      const request = new NextRequest(
        `http://localhost:3000/api/refrigerators/${testRefrigerator.id}/ingredients`,
        {
          method: 'POST',
          body: JSON.stringify(ingredient),
        }
      );

      const response = await ADD_INGREDIENT(request, { params: { refrigeratorId: testRefrigerator.id.toString() } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        name: ingredient.name,
        category: ingredient.category,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        expiryDate: ingredient.expiryDate,
      });
    });

    it('존재하지 않는 냉장고에는 재료를 추가할 수 없다', async () => {
      const ingredient = {
        name: '당근',
        category: '채소',
        quantity: 3,
        unit: '개',
      };

      const request = new NextRequest(
        'http://localhost:3000/api/refrigerators/999/ingredients',
        {
          method: 'POST',
          body: JSON.stringify(ingredient),
        }
      );

      const addRes = await ADD_INGREDIENT(request, { params: { refrigeratorId: '999' } });
      const error = await addRes.json();

      expect(addRes.status).toBe(404);
      expect(error).toEqual({ error: '냉장고를 찾을 수 없습니다.' });
    });
  });

  describe('GET /api/refrigerators/[refrigeratorId]/ingredients', () => {
    it('냉장고의 재료 목록을 조회할 수 있다', async () => {
      // 테스트 냉장고 생성
      const [testRefrigerator] = await db
        .insert(refrigerators)
        .values({
          name: '테스트 냉장고',
          ownerId: testUserId,
          type: 'normal',
          isShared: false,
        })
        .returning();

      // 테스트 재료 추가
      const ingredient = {
        name: '당근',
        category: '채소',
        quantity: 3,
        unit: '개',
        expiryDate: new Date('2024-12-31').toISOString(),
      };

      const addRequest = new NextRequest(
        `http://localhost:3000/api/refrigerators/${testRefrigerator.id}/ingredients`,
        {
          method: 'POST',
          body: JSON.stringify(ingredient),
        }
      );
      await ADD_INGREDIENT(addRequest, { params: { refrigeratorId: testRefrigerator.id.toString() } });

      // 재료 목록 조회
      const request = new NextRequest(
        `http://localhost:3000/api/refrigerators/${testRefrigerator.id}/ingredients`
      );
      const response = await GET_INGREDIENTS(request, { params: { refrigeratorId: testRefrigerator.id.toString() } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data[0]).toMatchObject({
        name: ingredient.name,
        category: ingredient.category,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        expiryDate: ingredient.expiryDate,
      });
    });
  });

  describe('PATCH /api/refrigerators/[refrigeratorId]/ingredients/[ingredientId]', () => {
    it('냉장고의 재료를 수정할 수 있다', async () => {
      // 테스트 냉장고 생성
      const [testRefrigerator] = await db
        .insert(refrigerators)
        .values({
          name: '테스트 냉장고',
          ownerId: testUserId,
          type: 'normal',
          isShared: false,
        })
        .returning();

      // 테스트 재료 추가
      const ingredient = {
        name: '당근',
        category: '채소',
        quantity: 3,
        unit: '개',
        expiryDate: new Date('2024-12-31').toISOString(),
      };

      const addRequest = new NextRequest(
        `http://localhost:3000/api/refrigerators/${testRefrigerator.id}/ingredients`,
        {
          method: 'POST',
          body: JSON.stringify(ingredient),
        }
      );
      const addResponse = await ADD_INGREDIENT(addRequest, { params: { refrigeratorId: testRefrigerator.id.toString() } });
      const { id: ingredientId } = await addResponse.json();

      // 재료 수정
      const updateData = {
        quantity: 5,
        expiryDate: new Date('2024-12-25').toISOString(),
      };

      const request = new NextRequest(
        `http://localhost:3000/api/refrigerators/${testRefrigerator.id}/ingredients/${ingredientId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(updateData),
        }
      );

      const response = await UPDATE_INGREDIENT(request, {
        params: {
          refrigeratorId: testRefrigerator.id.toString(),
          ingredientId: ingredientId.toString(),
        },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        id: ingredientId,
        name: ingredient.name,
        category: ingredient.category,
        quantity: updateData.quantity,
        unit: ingredient.unit,
        expiryDate: updateData.expiryDate,
      });
    });
  });

  describe('DELETE /api/refrigerators/[refrigeratorId]/ingredients/[ingredientId]', () => {
    it('냉장고의 재료를 삭제할 수 있다', async () => {
      // 테스트 냉장고 생성
      const [testRefrigerator] = await db
        .insert(refrigerators)
        .values({
          name: '테스트 냉장고',
          ownerId: testUserId,
          type: 'normal',
          isShared: false,
        })
        .returning();

      // 테스트 재료 추가
      const ingredient = {
        name: '당근',
        category: '채소',
        quantity: 3,
        unit: '개',
      };

      const addRequest = new NextRequest(
        `http://localhost:3000/api/refrigerators/${testRefrigerator.id}/ingredients`,
        {
          method: 'POST',
          body: JSON.stringify(ingredient),
        }
      );
      const addResponse = await ADD_INGREDIENT(addRequest, { params: { refrigeratorId: testRefrigerator.id.toString() } });
      const { id: ingredientId } = await addResponse.json();

      // 재료 삭제
      const request = new NextRequest(
        `http://localhost:3000/api/refrigerators/${testRefrigerator.id}/ingredients/${ingredientId}`,
        {
          method: 'DELETE',
        }
      );

      const response = await DELETE_INGREDIENT(request, {
        params: {
          refrigeratorId: testRefrigerator.id.toString(),
          ingredientId: ingredientId.toString(),
        },
      });

      expect(response.status).toBe(200);

      // 삭제 확인
      const getRequest = new NextRequest(
        `http://localhost:3000/api/refrigerators/${testRefrigerator.id}/ingredients`
      );
      const getResponse = await GET_INGREDIENTS(getRequest, {
        params: { refrigeratorId: testRefrigerator.id.toString() },
      });
      const data = await getResponse.json();

      expect(data).toHaveLength(0);
    });
  });
}); 