import { clerkClient, getAuth, currentUser } from '@clerk/nextjs/server';
import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/db';
import { sharedRefrigerators, refrigerators } from '@/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/refrigerators/invitations/sent - 보낸 초대장 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { userId } = await getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "이메일 정보를 찾을 수 없습니다." }, { status: 401 });
    }

    // 내가 소유한 냉장고의 초대장 목록 조회
    const invitations = await db
      .select({
        id: sharedRefrigerators.id,
        refrigeratorId: refrigerators.id,
        refrigeratorName: refrigerators.name,
        ownerId: refrigerators.ownerId,
        invitedEmail: sharedRefrigerators.invitedEmail,
        status: sharedRefrigerators.status,
        role: sharedRefrigerators.role,
        createdAt: sharedRefrigerators.createdAt,
      })
      .from(sharedRefrigerators)
      .innerJoin(
        refrigerators,
        eq(refrigerators.id, sharedRefrigerators.refrigeratorId)
      )
      .where(eq(refrigerators.ownerId, userId));

    // 응답에 현재 사용자 이름 추가
    const invitationsWithOwnerName = invitations.map(invitation => ({
      ...invitation,
      ownerName: user.firstName && user.lastName 
        ? `${user.firstName} ${user.lastName}`
        : user.firstName || user.lastName || user.emailAddresses[0].emailAddress.split('@')[0],
    }));

    return NextResponse.json(invitationsWithOwnerName);
  } catch (error) {
    console.error("[INVITATIONS_SENT_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
} 