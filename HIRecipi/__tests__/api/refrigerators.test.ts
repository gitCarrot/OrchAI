import { auth, currentUser } from '@clerk/nextjs';
import { NextRequest } from 'next/server';
import { POST as CREATE_REFRIGERATOR } from '@/app/api/refrigerators/route';
import { GET as GET_BY_ID } from '@/app/api/refrigerators/[refrigeratorId]/route';
import { PATCH as UPDATE_REFRIGERATOR } from '@/app/api/refrigerators/[refrigeratorId]/route';
import { DELETE } from '@/app/api/refrigerators/[refrigeratorId]/route';
import { db } from '@/db';
import { refrigerators } from '@/db/schema';

// Clerk 인증 모킹
jest.mock('@clerk/nextjs', () => ({
  auth: jest.fn(),
  currentUser: jest.fn(),
}));

describe('냉장고 API 테스트', () => {
  const testUserId = 'test_user_id';
  const testUserEmail = 'test@example.com';

  beforeEach(() => {
    // 기본 모킹 값 설정
    (auth as jest.Mock).mockImplementation(async () => ({
      userId: testUserId,
      user: {
        id: testUserId,
        emailAddresses: [{ emailAddress: testUserEmail }],
      }
    }));

    (currentUser as jest.Mock).mockImplementation(async () => ({
      id: testUserId,
      emailAddresses: [{ emailAddress: testUserEmail }],
    }));
  });

  afterEach(async () => {
    await db.delete(refrigerators);
    jest.clearAllMocks();
  });

  describe('POST /api/refrigerators', () => {
    it('새로운 냉장고를 생성할 수 있다', async () => {
      const testRefrigerator = {
        name: '테스트 냉장고',
        description: '테스트용 냉장고입니다.',
        type: 'normal' as const,
      };

      const request = new NextRequest('http://localhost:3000/api/refrigerators', {
        method: 'POST',
        body: JSON.stringify(testRefrigerator),
      });

      const response = await CREATE_REFRIGERATOR(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        name: testRefrigerator.name,
        description: testRefrigerator.description,
        type: testRefrigerator.type,
        ownerId: testUserId,
      });
    });

    it('가상 냉장고는 하나만 생성할 수 있다', async () => {
      // 첫 번째 가상 냉장고 생성
      const virtualRefrigerator = {
        name: '가상 냉장고',
        type: 'virtual' as const,
      };

      const firstRequest = new NextRequest('http://localhost:3000/api/refrigerators', {
        method: 'POST',
        body: JSON.stringify(virtualRefrigerator),
      });
      await CREATE_REFRIGERATOR(firstRequest);

      // 두 번째 가상 냉장고 생성 시도
      const secondRequest = new NextRequest('http://localhost:3000/api/refrigerators', {
        method: 'POST',
        body: JSON.stringify(virtualRefrigerator),
      });
      const response = await CREATE_REFRIGERATOR(secondRequest);
      const error = await response.json();

      expect(response.status).toBe(400);
      expect(error).toEqual({ error: '가상 냉장고는 하나만 생성할 수 있습니다.' });
    });
  });

  describe('GET /api/refrigerators/[id]', () => {
    it('특정 냉장고를 조회할 수 있다', async () => {
      // 테스트 냉장고 생성
      const [testRefrigerator] = await db
        .insert(refrigerators)
        .values({
          name: '테스트 냉장고',
          description: '테스트용 냉장고입니다.',
          type: 'normal',
          ownerId: testUserId,
          isShared: false,
        })
        .returning();

      const request = new NextRequest(`http://localhost:3000/api/refrigerators/${testRefrigerator.id}`);
      const response = await GET_BY_ID(request, { params: { refrigeratorId: testRefrigerator.id.toString() } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        id: testRefrigerator.id,
        name: testRefrigerator.name,
        description: testRefrigerator.description,
        isOwner: true,
      });
    });

    it('존재하지 않는 냉장고는 404를 반환한다', async () => {
      const request = new NextRequest('http://localhost:3000/api/refrigerators/999');
      const response = await GET_BY_ID(request, { params: { refrigeratorId: '999' } });
      const error = await response.json();

      expect(response.status).toBe(404);
      expect(error).toEqual({ error: '존재하지 않는 냉장고입니다.' });
    });
  });

  describe('PATCH /api/refrigerators/[id]', () => {
    it('냉장고 정보를 수정할 수 있다', async () => {
      // 테스트 냉장고 생성
      const [testRefrigerator] = await db
        .insert(refrigerators)
        .values({
          name: '테스트 냉장고',
          description: '테스트용 냉장고입니다.',
          type: 'normal',
          ownerId: testUserId,
          isShared: false,
        })
        .returning();

      const updateData = {
        name: '수정된 냉장고',
        description: '수정된 설명',
      };

      const request = new NextRequest(`http://localhost:3000/api/refrigerators/${testRefrigerator.id}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData),
      });

      const response = await UPDATE_REFRIGERATOR(request, { params: { refrigeratorId: testRefrigerator.id.toString() } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        id: testRefrigerator.id,
        ...updateData,
      });
    });
  });

  describe('DELETE /api/refrigerators/[id]', () => {
    it('냉장고를 삭제할 수 있다', async () => {
      // 테스트 냉장고 생성
      const [testRefrigerator] = await db
        .insert(refrigerators)
        .values({
          name: '테스트 냉장고',
          description: '테스트용 냉장고입니다.',
          type: 'normal',
          ownerId: testUserId,
          isShared: false,
        })
        .returning();

      const deleteRequest = new NextRequest(`http://localhost:3000/api/refrigerators/${testRefrigerator.id}`, {
        method: 'DELETE',
      });

      const response = await DELETE(deleteRequest, { params: { refrigeratorId: testRefrigerator.id.toString() } });

      expect(response.status).toBe(204);

      // 삭제 확인
      const getRequest = new NextRequest(`http://localhost:3000/api/refrigerators/${testRefrigerator.id}`);
      const getResponse = await GET_BY_ID(getRequest, { params: { refrigeratorId: testRefrigerator.id.toString() } });
      const error = await getResponse.json();

      expect(getResponse.status).toBe(404);
      expect(error).toEqual({ error: '존재하지 않는 냉장고입니다.' });
    });

    it('가상 냉장고는 삭제할 수 없다', async () => {
      // 가상 냉장고 생성
      const [virtualRefrigerator] = await db
        .insert(refrigerators)
        .values({
          name: '가상 냉장고',
          type: 'virtual',
          ownerId: testUserId,
          isShared: false,
        })
        .returning();

      const deleteRequest = new NextRequest(`http://localhost:3000/api/refrigerators/${virtualRefrigerator.id}`, {
        method: 'DELETE',
      });

      const response = await DELETE(deleteRequest, { params: { refrigeratorId: virtualRefrigerator.id.toString() } });
      const error = await response.json();

      expect(response.status).toBe(400);
      expect(error).toEqual({ error: '가상 냉장고는 삭제할 수 없습니다.' });
    });
  });
}); 