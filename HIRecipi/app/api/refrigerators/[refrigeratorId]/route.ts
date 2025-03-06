import { getAuth, clerkClient, currentUser } from '@clerk/nextjs/server';
import { NextResponse, NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { refrigerators, refrigeratorIngredients, sharedRefrigerators, categories, refrigeratorMembers, refrigeratorCategories, categoryTranslations, ingredients } from '@/db/schema';
import { and, eq, sql, inArray } from 'drizzle-orm';
import { getUserId } from '../utils';

interface IMember {
  userId: string;
  refrigeratorId: number;
  role: 'owner' | 'admin' | 'viewer';
  email?: string;
}

// 냉장고 수정 스키마
const updateRefrigeratorSchema = z.object({
  name: z.string().min(1, "이름을 입력해주세요.").max(100, "이름이 너무 깁니다.").optional(),
  description: z.string().max(255, "설명이 너무 깁니다.").optional(),
});

// GET /api/refrigerators/[refrigeratorId] - 냉장고 상세 정보 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { refrigeratorId: string } }
) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 현재 사용자의 이메일 주소 가져오기
    const user = await currentUser();
    const userEmail = user?.emailAddresses[0]?.emailAddress;
    if (!userEmail) {
      return NextResponse.json({ error: "이메일 정보를 찾을 수 없습니다." }, { status: 401 });
    }

    const { refrigeratorId } = await Promise.resolve(params);
    const parsedRefrigeratorId = parseInt(refrigeratorId);
    
    if (isNaN(parsedRefrigeratorId)) {
      return NextResponse.json({ error: "유효하지 않은 냉장고 ID입니다." }, { status: 400 });
    }

    // 1. 먼저 멤버십 확인 (소유자 또는 공유된 멤버인지)
    const refrigerator = await db.query.refrigerators.findFirst({
      where: eq(refrigerators.id, parsedRefrigeratorId),
    });

    if (!refrigerator) {
      return NextResponse.json({ error: "냉장고를 찾을 수 없습니다." }, { status: 404 });
    }

    const isOwner = refrigerator.ownerId === userId;

    // 공유 멤버 정보 조회
    const sharedMember = await db.query.sharedRefrigerators.findFirst({
      where: and(
        eq(sharedRefrigerators.refrigeratorId, parsedRefrigeratorId),
        eq(sharedRefrigerators.invitedEmail, userEmail),
        eq(sharedRefrigerators.status, "accepted")
      ),
    });

    // 접근 권한 확인
    if (!isOwner && !sharedMember) {
      console.log('[DEBUG] 접근 거부:', { isOwner, userId, refrigeratorId: parsedRefrigeratorId });
      return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 });
    }

    // 2. 권한이 확인되면 전체 정보 조회
    const fullRefrigerator = await db.query.refrigerators.findFirst({
      where: eq(refrigerators.id, parsedRefrigeratorId),
    });

    if (!fullRefrigerator) {
      return NextResponse.json({ error: "냉장고 정보를 불러올 수 없습니다." }, { status: 404 });
    }

    // 4. 공유 멤버 정보 조회
    const sharedMembers = await db.query.sharedRefrigerators.findMany({
      where: and(
        eq(sharedRefrigerators.refrigeratorId, parsedRefrigeratorId),
        eq(sharedRefrigerators.status, "accepted")
      ),
    });

    // 5. 응답 데이터 구성
    const formattedMembers: IMember[] = sharedMembers.map(member => ({
      userId: member.ownerId,
      refrigeratorId: parsedRefrigeratorId,
      role: member.role,
      email: member.invitedEmail,
    }));

    if (isOwner) {
      formattedMembers.push({
        userId,
        refrigeratorId: parsedRefrigeratorId,
        role: 'owner',
        email: userEmail,
      });
    }

    const responseData = {
      ...fullRefrigerator,
      isOwner,
      role: isOwner ? 'owner' : (sharedMember?.role || 'viewer'),
      memberCount: sharedMembers.length + (isOwner ? 1 : 0),
      ingredientCount: fullRefrigerator.ingredients?.length || 0,
      members: formattedMembers,
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("[REFRIGERATOR_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

// PATCH /api/refrigerators/[refrigeratorId] - 냉장고 정보 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: { refrigeratorId: string } }
) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // params를 Promise.resolve로 처리
    const { refrigeratorId } = await Promise.resolve(params);
    const parsedRefrigeratorId = parseInt(refrigeratorId);
    if (isNaN(parsedRefrigeratorId)) {
      return NextResponse.json({ error: "유효하지 않은 냉장고 ID입니다." }, { status: 400 });
    }

    const body = await request.json();
    const { name, description } = body;

    // 냉장고 소유자 확인
    const [refrigerator] = await db
      .select()
      .from(refrigerators)
      .where(eq(refrigerators.id, parsedRefrigeratorId));

    if (!refrigerator) {
      return NextResponse.json({ error: "냉장고를 찾을 수 없습니다." }, { status: 404 });
    }

    if (refrigerator.ownerId !== userId) {
      return NextResponse.json({ error: "냉장고 소유자만 수정할 수 있습니다." }, { status: 403 });
    }

    // 냉장고 정보 업데이트
    const [updatedRefrigerator] = await db
      .update(refrigerators)
      .set({
        name,
        description,
        updatedAt: new Date(),
      })
      .where(eq(refrigerators.id, parsedRefrigeratorId))
      .returning();

    return NextResponse.json(updatedRefrigerator);
  } catch (error) {
    console.error("[REFRIGERATOR_PATCH]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

// DELETE /api/refrigerators/[refrigeratorId] - 냉장고 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { refrigeratorId: string } }
) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // params를 Promise.resolve로 처리
    const { refrigeratorId } = await Promise.resolve(params);
    const parsedRefrigeratorId = parseInt(refrigeratorId);
    if (isNaN(parsedRefrigeratorId)) {
      return NextResponse.json({ error: "유효하지 않은 냉장고 ID입니다." }, { status: 400 });
    }

    // 냉장고 소유자 확인
    const [refrigerator] = await db
      .select()
      .from(refrigerators)
      .where(eq(refrigerators.id, parsedRefrigeratorId));

    if (!refrigerator) {
      return NextResponse.json({ error: "냉장고를 찾을 수 없습니다." }, { status: 404 });
    }

    if (refrigerator.ownerId !== userId) {
      return NextResponse.json({ error: "냉장고 소유자만 삭제할 수 있습니다." }, { status: 403 });
    }

    // 냉장고 삭제
    await db
      .delete(refrigerators)
      .where(eq(refrigerators.id, parsedRefrigeratorId));

    return NextResponse.json({ message: "냉장고가 삭제되었습니다." });
  } catch (error) {
    console.error("[REFRIGERATOR_DELETE]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
} 