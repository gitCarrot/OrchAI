import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/db';
import { refrigerators, refrigeratorMembers, refrigeratorIngredients, users } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { getUserId } from './utils';
import { currentUser } from '@clerk/nextjs/server';


// GET /api/refrigerators - 냉장고 목록 조회
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 냉장고 목록 조회 (멤버 수와 재료 수를 포함)
    const refrigeratorList = await db.query.refrigerators.findMany({
      where: eq(refrigerators.ownerId, userId),
      with: {
        members: true,
        ingredients: true,
      },
      orderBy: [sql`${refrigerators.updatedAt} DESC`],
    });

    // 응답 데이터 가공
    const formattedRefrigerators = refrigeratorList.map(refrigerator => ({
      id: refrigerator.id,
      name: refrigerator.name,
      description: refrigerator.description,
      ownerId: refrigerator.ownerId,
      isOwner: true,
      role: 'owner' as const,
      memberCount: refrigerator.members.length + 1,
      ingredientCount: refrigerator.ingredients.length,
      createdAt: refrigerator.createdAt,
      updatedAt: refrigerator.updatedAt,
    }));

    return NextResponse.json(formattedRefrigerators);
  } catch (error) {
    console.error("[REFRIGERATORS_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

// 냉장고 생성 스키마
const createSchema = z.object({
  name: z.string().min(1, "이름은 필수입니다."),
  description: z.string().nullable().optional(),
});

// POST /api/refrigerators - 냉장고 생성
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await request.json();
    const { name, description } = createSchema.parse(json);

    // 사용자 정보 확인 및 동기화
    const existingUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!existingUser) {
      const user = await currentUser();
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      // 사용자 정보가 없으면 생성
      await db.insert(users).values({
        id: userId,
        email: user.emailAddresses[0]?.emailAddress || '',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // 냉장고 생성
    const [refrigerator] = await db.insert(refrigerators)
      .values({
        name,
        description: description || null,
        ownerId: userId,
        type: 'normal',
        isShared: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // 생성된 냉장고의 전체 정보를 조회
    const newRefrigerator = {
      ...refrigerator,
      isOwner: true,
      role: 'owner' as const,
      memberCount: 1, // 소유자만 있으므로 1
      ingredientCount: 0, // 새로 생성된 냉장고이므로 0
      members: [], // 초기에는 소유자만 있음
    };

    return NextResponse.json(newRefrigerator);
  } catch (error) {
    console.error("[REFRIGERATOR_CREATE]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
} 