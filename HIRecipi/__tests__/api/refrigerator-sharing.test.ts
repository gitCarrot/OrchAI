import { NextRequest } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs';
import { db } from '@/db';
import { refrigerators, sharedRefrigerators, refrigeratorIngredients } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { POST as CREATE_REFRIGERATOR } from '@/app/api/refrigerators/route';
import { POST as SHARE_REFRIGERATOR } from '@/app/api/refrigerators/[refrigeratorId]/share/route';
import { GET as GET_INVITATIONS } from '@/app/api/refrigerators/invitations/route';
import { PATCH as RESPOND_INVITATION } from '@/app/api/refrigerators/invitations/[invitationId]/route';
import { GET as GET_REFRIGERATOR, PATCH as UPDATE_REFRIGERATOR } from '@/app/api/refrigerators/[refrigeratorId]/route';
import { POST as ADD_INGREDIENT } from '@/app/api/refrigerators/[refrigeratorId]/ingredients/route';

// Clerk 인증 모킹
jest.mock('@clerk/nextjs', () => ({
  auth: jest.fn(async () => ({ userId: 'test_user_id' })),
  currentUser: jest.fn(async () => ({
    id: 'test_user_id',
    emailAddresses: [{ emailAddress: 'test@example.com' }],
  })),
}));

describe('냉장고 공유 API 테스트', () => {
  // 테스트 데이터
  const testUserId = 'test_user_id';
  const testUserEmail = 'test@example.com';
  const invitedUserId = 'invited_user_id';
  const invitedUserEmail = 'invited@example.com';

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
    // 테스트 데이터 정리
    await db.delete(sharedRefrigerators);
    await db.delete(refrigerators);
    jest.clearAllMocks();
  });

  describe('POST /api/refrigerators/[refrigeratorId]/share', () => {
    it('냉장고를 다른 사용자와 공유할 수 있다', async () => {
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

      const request = new NextRequest(
        `http://localhost:3000/api/refrigerators/${testRefrigerator.id}/share`,
        {
          method: 'POST',
          body: JSON.stringify({ email: invitedUserEmail }),
        }
      );

      const response = await SHARE_REFRIGERATOR(request, { params: { refrigeratorId: testRefrigerator.id.toString() } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        refrigeratorId: testRefrigerator.id,
        invitedEmail: invitedUserEmail,
        status: 'pending',
      });
    });

    it('이미 초대된 사용자는 다시 초대할 수 없다', async () => {
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

      // 기존 초대 생성
      await db
        .insert(sharedRefrigerators)
        .values({
          refrigeratorId: testRefrigerator.id,
          ownerId: testUserId,
          invitedEmail: invitedUserEmail,
          status: 'pending',
        });

      const request = new NextRequest(
        `http://localhost:3000/api/refrigerators/${testRefrigerator.id}/share`,
        {
          method: 'POST',
          body: JSON.stringify({ email: invitedUserEmail }),
        }
      );

      const response = await SHARE_REFRIGERATOR(request, { params: { refrigeratorId: testRefrigerator.id.toString() } });
      const error = await response.json();

      expect(response.status).toBe(400);
      expect(error).toEqual({ error: '이미 초대된 사용자입니다.' });
    });
  });

  describe('GET /api/refrigerators/invitations', () => {
    it('받은 초대 목록을 조회할 수 있다', async () => {
      // 초대받은 사용자로 auth 모킹 변경
      (auth as jest.Mock).mockImplementation(async () => ({
        userId: invitedUserId,
      }));

      (currentUser as jest.Mock).mockImplementation(async () => ({
        id: invitedUserId,
        emailAddresses: [{ emailAddress: invitedUserEmail }],
      }));

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

      // 초대 생성
      await db
        .insert(sharedRefrigerators)
        .values({
          refrigeratorId: testRefrigerator.id,
          ownerId: testUserId,
          invitedEmail: invitedUserEmail,
          status: 'pending',
        });

      const request = new NextRequest('http://localhost:3000/api/refrigerators/invitations');
      const response = await GET_INVITATIONS(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data[0]).toMatchObject({
        refrigeratorId: testRefrigerator.id,
        refrigeratorName: testRefrigerator.name,
        invitedBy: testUserId,
        status: 'pending',
      });
    });
  });

  describe('PATCH /api/refrigerators/invitations/[invitationId]', () => {
    it('초대를 수락할 수 있다', async () => {
      // 초대받는 사용자로 모킹 변경
      (auth as jest.Mock).mockImplementation(async () => ({
        userId: 'invited_user_id',
      }));

      (currentUser as jest.Mock).mockImplementation(async () => ({
        id: 'invited_user_id',
        emailAddresses: [{ emailAddress: 'test@example.com' }],
      }));

      // 냉장고 생성 및 초대
      const createRequest = new NextRequest('http://localhost:3000/api/refrigerators', {
        method: 'POST',
        body: JSON.stringify({
          name: '테스트 냉장고',
          description: '테스트용 냉장고입니다.',
          type: 'normal' as const,
        }),
      });
      const createResponse = await CREATE_REFRIGERATOR(createRequest);
      const { id: refrigeratorId } = await createResponse.json();

      const shareRequest = new NextRequest(`http://localhost:3000/api/refrigerators/${refrigeratorId}/share`, {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
        }),
      });
      const shareResponse = await SHARE_REFRIGERATOR(shareRequest, { params: { refrigeratorId: refrigeratorId.toString() } });
      const { id: invitationId } = await shareResponse.json();

      // 초대 수락
      const acceptRequest = new NextRequest(`http://localhost:3000/api/refrigerators/invitations/${invitationId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'accepted',
        }),
      });
      const response = await RESPOND_INVITATION(acceptRequest, { params: { invitationId: invitationId.toString() } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        status: 'accepted',
      });
    });

    it('초대를 거절할 수 있다', async () => {
      // 초대받는 사용자로 모킹 변경
      (auth as jest.Mock).mockImplementation(async () => ({
        userId: 'invited_user_id',
      }));

      (currentUser as jest.Mock).mockImplementation(async () => ({
        id: 'invited_user_id',
        emailAddresses: [{ emailAddress: 'test@example.com' }],
      }));

      // 냉장고 생성 및 초대
      const createRequest = new NextRequest('http://localhost:3000/api/refrigerators', {
        method: 'POST',
        body: JSON.stringify({
          name: '테스트 냉장고',
          description: '테스트용 냉장고입니다.',
          type: 'normal' as const,
        }),
      });
      const createResponse = await CREATE_REFRIGERATOR(createRequest);
      const { id: refrigeratorId } = await createResponse.json();

      const shareRequest = new NextRequest(`http://localhost:3000/api/refrigerators/${refrigeratorId}/share`, {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
        }),
      });
      const shareResponse = await SHARE_REFRIGERATOR(shareRequest, { params: { refrigeratorId: refrigeratorId.toString() } });
      const { id: invitationId } = await shareResponse.json();

      // 초대 거절
      const rejectRequest = new NextRequest(`http://localhost:3000/api/refrigerators/invitations/${invitationId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'rejected',
        }),
      });
      const response = await RESPOND_INVITATION(rejectRequest, { params: { invitationId: invitationId.toString() } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        status: 'rejected',
      });
    });

    it('이미 처리된 초대는 다시 처리할 수 없다', async () => {
      // 초대받는 사용자로 모킹 변경
      (auth as jest.Mock).mockImplementation(async () => ({
        userId: 'invited_user_id',
      }));

      (currentUser as jest.Mock).mockImplementation(async () => ({
        id: 'invited_user_id',
        emailAddresses: [{ emailAddress: 'test@example.com' }],
      }));

      // 냉장고 생성 및 초대
      const createRequest = new NextRequest('http://localhost:3000/api/refrigerators', {
        method: 'POST',
        body: JSON.stringify({
          name: '테스트 냉장고',
          description: '테스트용 냉장고입니다.',
          type: 'normal' as const,
        }),
      });
      const createResponse = await CREATE_REFRIGERATOR(createRequest);
      const { id: refrigeratorId } = await createResponse.json();

      const shareRequest = new NextRequest(`http://localhost:3000/api/refrigerators/${refrigeratorId}/share`, {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
        }),
      });
      const shareResponse = await SHARE_REFRIGERATOR(shareRequest, { params: { refrigeratorId: refrigeratorId.toString() } });
      const { id: invitationId } = await shareResponse.json();

      // 첫 번째 응답 (수락)
      const firstRequest = new NextRequest(`http://localhost:3000/api/refrigerators/invitations/${invitationId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'accepted',
        }),
      });
      await RESPOND_INVITATION(firstRequest, { params: { invitationId: invitationId.toString() } });

      // 두 번째 응답 시도 (거절)
      const secondRequest = new NextRequest(`http://localhost:3000/api/refrigerators/invitations/${invitationId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'rejected',
        }),
      });
      const response = await RESPOND_INVITATION(secondRequest, { params: { invitationId: invitationId.toString() } });
      const error = await response.json();

      expect(response.status).toBe(400);
      expect(error).toEqual({ error: '이미 처리된 초대입니다.' });
    });
  });

  describe('공유받은 냉장고 접근 권한 테스트', () => {
    let refrigeratorId: number;
    let invitationId: number;

    beforeEach(async () => {
      // 냉장고 생성 (소유자로 모킹)
      (auth as jest.Mock).mockImplementation(async () => ({
        userId: 'test_user_id',
        user: {
          id: 'test_user_id',
          emailAddresses: [{ emailAddress: 'owner@example.com' }],
        }
      }));

      (currentUser as jest.Mock).mockImplementation(async () => ({
        id: 'test_user_id',
        emailAddresses: [{ emailAddress: 'owner@example.com' }],
      }));

      // 냉장고 생성
      const [testRefrigerator] = await db
        .insert(refrigerators)
        .values({
          name: '테스트 냉장고',
          description: '테스트용 냉장고입니다.',
          type: 'normal',
          ownerId: 'test_user_id',
          isShared: true,
        })
        .returning();
      refrigeratorId = testRefrigerator.id;

      // 공유 정보 직접 생성
      await db
        .insert(sharedRefrigerators)
        .values({
          refrigeratorId: refrigeratorId,
          ownerId: 'test_user_id',
          invitedEmail: 'test@example.com',
          status: 'accepted',
        });

      // 초대받는 사용자로 모킹 변경
      (auth as jest.Mock).mockImplementation(async () => ({
        userId: 'shared_user_id',
        user: {
          id: 'shared_user_id',
          emailAddresses: [{ emailAddress: 'test@example.com' }],
        }
      }));

      (currentUser as jest.Mock).mockImplementation(async () => ({
        id: 'shared_user_id',
        emailAddresses: [{ emailAddress: 'test@example.com' }],
      }));
    });

    it('공유받은 냉장고의 상세 정보를 조회할 수 있다', async () => {
      const request = new NextRequest(`http://localhost:3000/api/refrigerators/${refrigeratorId}`);
      const response = await GET_REFRIGERATOR(request, { params: { refrigeratorId: refrigeratorId.toString() } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        id: refrigeratorId,
        name: '테스트 냉장고',
        description: '테스트용 냉장고입니다.',
        isOwner: false,
      });
    });

    it('공유받은 냉장고에 재료를 추가할 수 있다', async () => {
      const ingredient = {
        name: '테스트 재료',
        category: '기타',
        quantity: 1,
        unit: '개',
        expiryDate: new Date().toISOString(),
      };

      const request = new NextRequest(`http://localhost:3000/api/refrigerators/${refrigeratorId}/ingredients`, {
        method: 'POST',
        body: JSON.stringify(ingredient),
      });
      const response = await ADD_INGREDIENT(request, { params: { refrigeratorId: refrigeratorId.toString() } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        name: ingredient.name,
        category: ingredient.category,
        unit: ingredient.unit,
        quantity: ingredient.quantity,
      });
    });

    it('공유받은 냉장고의 정보를 수정할 수 없다', async () => {
      const updateData = {
        name: '수정된 냉장고 이름',
        description: '수정된 설명',
      };

      const request = new NextRequest(`http://localhost:3000/api/refrigerators/${refrigeratorId}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData),
      });
      const response = await UPDATE_REFRIGERATOR(request, { params: { refrigeratorId: refrigeratorId.toString() } });
      const error = await response.json();

      expect(response.status).toBe(403);
      expect(error).toEqual({ error: '수정 권한이 없습니다.' });

      // DB에서 냉장고 정보가 변경되지 않았는지 확인
      const refrigerator = await db
        .select()
        .from(refrigerators)
        .where(eq(refrigerators.id, refrigeratorId))
        .limit(1);

      expect(refrigerator[0].name).toBe('테스트 냉장고');
      expect(refrigerator[0].description).toBe('테스트용 냉장고입니다.');
    });
  });
}); 