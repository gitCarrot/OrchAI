import { getAuth, currentUser } from '@clerk/nextjs/server';
import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

// POST /api/auth/user - 사용자 생성 또는 업데이트
export async function POST(request: NextRequest) {
  try {
    const { userId } = await getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 기존 사용자 확인
    const existingUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!existingUser) {
      const user = await currentUser();
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      await db.insert(users).values({
        id: userId,
        email: user.emailAddresses[0]?.emailAddress || '',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[USER_CREATE]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
} 