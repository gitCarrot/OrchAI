import { clerkClient, getAuth, currentUser } from '@clerk/nextjs/server';
import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/db';
import { refrigerators, sharedRefrigerators } from '@/db/schema';
import { desc, eq, and, not } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    const userEmail = user?.emailAddresses[0]?.emailAddress;
    if (!userEmail) {
      return NextResponse.json({ error: "Email not found" }, { status: 401 });
    }

    // Get shared refrigerators where the user is a member
    const sharedRefrigeratorsList = await db
      .select({
        id: refrigerators.id,
        name: refrigerators.name,
        description: refrigerators.description,
        type: refrigerators.type,
        isShared: refrigerators.isShared,
        role: sharedRefrigerators.role,
        ownerId: refrigerators.ownerId,
        createdAt: refrigerators.createdAt,
      })
      .from(sharedRefrigerators)
      .innerJoin(
        refrigerators,
        eq(refrigerators.id, sharedRefrigerators.refrigeratorId)
      )
      .where(
        and(
          eq(sharedRefrigerators.invitedEmail, userEmail),
          eq(sharedRefrigerators.status, "accepted")
        )
      );

    // Get shared members for each refrigerator
    const refrigeratorsWithMembers = await Promise.all(
      sharedRefrigeratorsList.map(async (refrigerator) => {
        const sharedMembers = await db
          .select({
            id: sharedRefrigerators.id,
            invitedEmail: sharedRefrigerators.invitedEmail,
            status: sharedRefrigerators.status,
            role: sharedRefrigerators.role,
          })
          .from(sharedRefrigerators)
          .where(
            and(
              eq(sharedRefrigerators.refrigeratorId, refrigerator.id),
              eq(sharedRefrigerators.status, "accepted")
            )
          );

        return {
          ...refrigerator,
          sharedWith: sharedMembers,
        };
      })
    );

    return NextResponse.json({
      refrigerators: refrigeratorsWithMembers,
    });
  } catch (error) {
    console.error("[SHARED_REFRIGERATORS_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
} 