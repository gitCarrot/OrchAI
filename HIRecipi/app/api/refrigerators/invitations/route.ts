import { clerkClient, getAuth, currentUser } from '@clerk/nextjs/server';
import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/db';
import { refrigerators, sharedRefrigerators } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

// GET /api/refrigerators/invitations - 받은 초대 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { userId } = await getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 현재 사용자의 이메일 주소 가져오기
    const user = await currentUser();
    const userEmail = user?.emailAddresses[0]?.emailAddress;
    if (!userEmail) {
      return NextResponse.json({ error: "이메일 정보를 찾을 수 없습니다." }, { status: 401 });
    }

    // 받은 초대 목록 조회
    const invitations = await db
      .select({
        id: sharedRefrigerators.id,
        refrigeratorId: sharedRefrigerators.refrigeratorId,
        refrigeratorName: refrigerators.name,
        ownerId: sharedRefrigerators.ownerId,
        status: sharedRefrigerators.status,
        role: sharedRefrigerators.role,
        createdAt: sharedRefrigerators.createdAt,
      })
      .from(sharedRefrigerators)
      .innerJoin(
        refrigerators,
        eq(refrigerators.id, sharedRefrigerators.refrigeratorId)
      )
      .where(eq(sharedRefrigerators.invitedEmail, userEmail));

    // 각 초대에 대해 소유자의 이메일 정보 가져오기
    const invitationsWithOwnerEmail = await Promise.all(
      invitations.map(async (invitation) => {
        const clerk = await clerkClient();
        const owner = await clerk.users.getUser(invitation.ownerId);
        const ownerEmail = owner.emailAddresses[0]?.emailAddress || 'Unknown';
        return {
          ...invitation,
          ownerEmail,
        };
      })
    );

    return NextResponse.json(invitationsWithOwnerEmail);
  } catch (error) {
    console.error("[INVITATIONS_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
} 