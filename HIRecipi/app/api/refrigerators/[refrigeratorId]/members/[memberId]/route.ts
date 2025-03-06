import { getAuth, currentUser } from '@clerk/nextjs/server'
import { NextResponse, NextRequest } from 'next/server'
import { db } from '@/db'
import { refrigerators, sharedRefrigerators } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

// PATCH /api/refrigerators/[refrigeratorId]/members/[memberId] - 멤버 권한 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: { refrigeratorId: string; memberId: string } }
) {
  try {
    const { userId } = await getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 현재 사용자의 이메일 주소 가져오기
    const user = await currentUser()
    const userEmail = user?.emailAddresses[0]?.emailAddress
    if (!userEmail) {
      return NextResponse.json({ error: "이메일 정보를 찾을 수 없습니다." }, { status: 401 })
    }

    const { refrigeratorId, memberId } = await Promise.resolve(params);
    const parsedRefrigeratorId = parseInt(refrigeratorId);
    const parsedMemberId = parseInt(memberId);
    if (isNaN(parsedRefrigeratorId) || isNaN(parsedMemberId)) {
      return NextResponse.json({ error: "유효하지 않은 ID입니다." }, { status: 400 });
    }

    // 요청 본문에서 새로운 role 가져오기
    const { role } = await request.json();
    if (!role || !['admin', 'viewer'].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // 냉장고 정보 조회
    const [refrigerator] = await db
      .select()
      .from(refrigerators)
      .where(eq(refrigerators.id, parsedRefrigeratorId))
      .limit(1);

    if (!refrigerator) {
      return NextResponse.json({ error: "존재하지 않는 냉장고입니다." }, { status: 404 });
    }

    // 권한 확인 (소유자만 권한 수정 가능)
    if (refrigerator.ownerId !== userId) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    // 멤버 권한 수정
    const result = await db
      .update(sharedRefrigerators)
      .set({ role })
      .where(and(
        eq(sharedRefrigerators.id, parsedMemberId),
        eq(sharedRefrigerators.refrigeratorId, parsedRefrigeratorId)
      ))
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: "멤버를 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("[REFRIGERATOR_MEMBER_PATCH]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

// DELETE /api/refrigerators/[refrigeratorId]/members/[memberId] - 멤버 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { refrigeratorId: string; memberId: string } }
) {
  try {
    const { userId } = await getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { refrigeratorId, memberId } = await Promise.resolve(params);
    const parsedRefrigeratorId = parseInt(refrigeratorId);
    const parsedMemberId = parseInt(memberId);
    if (isNaN(parsedRefrigeratorId) || isNaN(parsedMemberId)) {
      return NextResponse.json({ error: "유효하지 않은 ID입니다." }, { status: 400 });
    }

    // 냉장고 정보 조회
    const [refrigerator] = await db
      .select()
      .from(refrigerators)
      .where(eq(refrigerators.id, parsedRefrigeratorId))
      .limit(1);

    if (!refrigerator) {
      return NextResponse.json({ error: "존재하지 않는 냉장고입니다." }, { status: 404 });
    }

    // 권한 확인 (소유자만 멤버 삭제 가능)
    if (refrigerator.ownerId !== userId) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    // 멤버 삭제
    const result = await db
      .delete(sharedRefrigerators)
      .where(and(
        eq(sharedRefrigerators.id, parsedMemberId),
        eq(sharedRefrigerators.refrigeratorId, parsedRefrigeratorId)
      ))
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: "멤버를 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[REFRIGERATOR_MEMBER_DELETE]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
} 