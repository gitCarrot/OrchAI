import { getAuth, currentUser } from '@clerk/nextjs/server';
import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/db';
import { languagePreferences } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const languageSchema = z.object({
  language: z.enum(['ko', 'en', 'ja']),
});

// GET /api/users/language - 현재 사용자의 언어 설정 조회
export async function GET(request: NextRequest) {
  try {
    const { userId } = await getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const preference = await db.query.languagePreferences.findFirst({
      where: eq(languagePreferences.userId, userId),
    });

    return NextResponse.json({
      language: preference?.language || 'ko',
    });
  } catch (error) {
    console.error("[LANGUAGE_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

// PUT /api/users/language - 언어 설정 업데이트
export async function PUT(request: NextRequest) {
  try {
    const { userId } = await getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await request.json();
    const { language } = languageSchema.parse(json);

    // 기존 설정 확인
    const existing = await db.query.languagePreferences.findFirst({
      where: eq(languagePreferences.userId, userId),
    });

    if (existing) {
      // 업데이트
      await db
        .update(languagePreferences)
        .set({ 
          language,
          updatedAt: new Date(),
        })
        .where(eq(languagePreferences.userId, userId));
    } else {
      // 새로 생성
      await db.insert(languagePreferences).values({
        userId,
        language,
      });
    }

    return NextResponse.json({ language });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid language", details: error.errors },
        { status: 400 }
      );
    }

    console.error("[LANGUAGE_PUT]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
} 