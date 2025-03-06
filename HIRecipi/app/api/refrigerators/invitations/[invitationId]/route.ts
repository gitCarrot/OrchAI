import { getAuth, currentUser } from '@clerk/nextjs/server';
import { NextResponse, NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { sharedRefrigerators } from '@/db/schema';
import { eq } from 'drizzle-orm';

// 초대 응답 스키마
const invitationResponseSchema = z.object({
  action: z.enum(['accept', 'reject'], {
    required_error: "응답 상태를 선택해주세요.",
    invalid_type_error: "유효하지 않은 응답 상태입니다.",
  }),
});

// PATCH /api/refrigerators/invitations/[invitationId] - 초대 수락/거절
export async function PATCH(
  request: NextRequest,
  { params }: { params: { invitationId: string } }
) {
  try {
    const { userId } = await getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const invitationId = parseInt(params.invitationId);
    if (isNaN(invitationId)) {
      return NextResponse.json({ error: "유효하지 않은 초대 ID입니다." }, { status: 400 });
    }

    // 현재 사용자의 이메일 주소 가져오기
    const user = await currentUser();
    const userEmail = user?.emailAddresses[0]?.emailAddress;
    if (!userEmail) {
      return NextResponse.json({ error: "이메일 정보를 찾을 수 없습니다." }, { status: 401 });
    }

    // 초대 확인
    const invitation = await db
      .select()
      .from(sharedRefrigerators)
      .where(eq(sharedRefrigerators.id, invitationId))
      .limit(1);

    if (!invitation[0]) {
      return NextResponse.json({ error: "존재하지 않는 초대입니다." }, { status: 404 });
    }

    if (invitation[0].invitedEmail !== userEmail) {
      return NextResponse.json({ error: "이 초대에 대한 권한이 없습니다." }, { status: 403 });
    }

    console.log('Found invitation:', invitation[0]);

    if (invitation[0].status !== 'pending') {
      return NextResponse.json({ error: "이미 처리된 초대입니다." }, { status: 400 });
    }

    const body = await request.json();
    const validationResult = invitationResponseSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ error: validationResult.error.errors[0].message }, { status: 400 });
    }

    const { action } = validationResult.data;
    const status = action === 'accept' ? 'accepted' : 'rejected';

    console.log('Updating invitation status to:', status, 'with role:', invitation[0].role);
    // 초대 상태 업데이트
    const [updated] = await db
      .update(sharedRefrigerators)
      .set({
        status,
        role: invitation[0].role,
        updatedAt: new Date(),
      })
      .where(eq(sharedRefrigerators.id, invitationId))
      .returning();

    console.log('Updated invitation:', updated);

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[INVITATION_RESPONSE]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

// DELETE /api/refrigerators/invitations/[invitationId] - 초대 취소
export async function DELETE(
  request: NextRequest,
  { params }: { params: { invitationId: string } }
) {
  try {
    const { userId } = await getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const invitationId = parseInt(params.invitationId);
    if (isNaN(invitationId)) {
      return NextResponse.json({ error: "유효하지 않은 초대 ID입니다." }, { status: 400 });
    }

    // 초대 확인
    const [invitation] = await db
      .select()
      .from(sharedRefrigerators)
      .where(eq(sharedRefrigerators.id, invitationId))
      .limit(1);

    if (!invitation) {
      return NextResponse.json({ error: "존재하지 않는 초대입니다." }, { status: 404 });
    }

    // 초대를 보낸 사람만 취소할 수 있음
    if (invitation.ownerId !== userId) {
      return NextResponse.json({ error: "초대를 취소할 권한이 없습니다." }, { status: 403 });
    }

    // 이미 처리된 초대는 취소할 수 없음
    if (invitation.status === 'accepted') {
      return NextResponse.json({ error: "이미 수락된 초대는 취소할 수 없습니다." }, { status: 400 });
    }

    // 초대 삭제
    await db
      .delete(sharedRefrigerators)
      .where(eq(sharedRefrigerators.id, invitationId));

    return NextResponse.json({ message: "초대가 취소되었습니다." });
  } catch (error) {
    console.error("[INVITATION_DELETE]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
} 