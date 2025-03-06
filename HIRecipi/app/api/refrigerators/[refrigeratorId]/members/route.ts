import { getAuth, currentUser, clerkClient } from '@clerk/nextjs/server'
import { NextResponse, NextRequest } from 'next/server'
import { db } from '@/db'
import { refrigerators, sharedRefrigerators } from '@/db/schema'
import { eq, and, not } from 'drizzle-orm'

// GET /api/refrigerators/[refrigeratorId]/members - 냉장고 공유 멤버 목록 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { refrigeratorId: string } }
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

    // params를 Promise.resolve로 처리
    const { refrigeratorId } = await Promise.resolve(params);
    const parsedRefrigeratorId = parseInt(refrigeratorId);
    if (isNaN(parsedRefrigeratorId)) {
      return NextResponse.json({ error: "유효하지 않은 냉장고 ID입니다." }, { status: 400 });
    }

    // 냉장고 정보 조회
    const [refrigerator] = await db
      .select()
      .from(refrigerators)
      .where(eq(refrigerators.id, parsedRefrigeratorId))
      .limit(1)

    if (!refrigerator) {
      return NextResponse.json({ error: "존재하지 않는 냉장고입니다." }, { status: 404 })
    }

    // 접근 권한 확인 (소유자이거나 공유받은 사용자여야 함)
    const hasAccess = refrigerator.ownerId === userId || await db
      .select()
      .from(sharedRefrigerators)
      .where(and(
        eq(sharedRefrigerators.refrigeratorId, parsedRefrigeratorId),
        eq(sharedRefrigerators.invitedEmail, userEmail),
        eq(sharedRefrigerators.status, "accepted")
      ))
      .limit(1)
      .then(rows => rows.length > 0)

    if (!hasAccess) {
      return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 })
    }

    // 2. 공유받은 사용자들 정보
    const sharedMembers = await db
      .select({
        id: sharedRefrigerators.id,
        email: sharedRefrigerators.invitedEmail,
        role: sharedRefrigerators.role,
        status: sharedRefrigerators.status
      })
      .from(sharedRefrigerators)
      .where(and(
        eq(sharedRefrigerators.refrigeratorId, parsedRefrigeratorId),
        eq(sharedRefrigerators.status, "accepted")
      ))

    // 소유자 정보와 공유 멤버 정보를 구성
    const members = sharedMembers.map(member => ({
      ...member,
      role: member.email === userEmail && refrigerator.ownerId === userId ? 'owner' : member.role
    }));

    // 현재 사용자가 소유자인 경우
    if (refrigerator.ownerId === userId && !members.find(m => m.email === userEmail)) {
      members.unshift({
        id: 0,
        email: userEmail,
        role: 'owner',
        status: 'accepted'
      });
    }
    // 현재 사용자가 공유 멤버인 경우
    else if (!members.find(m => m.email === userEmail)) {
      members.unshift({
        id: 0,
        email: userEmail,
        role: 'admin',
        status: 'accepted'
      });
    }

    // 소유자 정보가 없는 경우 추가 (소유자가 아닌 경우에도 소유자 정보 표시)
    const clerk = await clerkClient();
    const owner = await clerk.users.getUser(refrigerator.ownerId);
    const ownerEmail = owner.emailAddresses[0]?.emailAddress || 'Unknown';

    if (ownerEmail && !members.find(m => m.email === ownerEmail)) {
      members.unshift({
        id: -1, // 소유자는 음수 ID로 구분
        email: ownerEmail,
        role: 'owner',
        status: 'accepted'
      });
    }

    return NextResponse.json(members)
  } catch (error) {
    console.error("[REFRIGERATOR_MEMBERS_GET]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
} 