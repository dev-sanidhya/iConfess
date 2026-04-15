import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { findMatches } from "@/lib/matching";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { confessionId, targetUserId } = await req.json();
    if (!confessionId || !targetUserId) {
      return NextResponse.json({ error: "Confession and target user are required" }, { status: 400 });
    }

    const confession = await prisma.confession.findUnique({
      where: { id: confessionId },
      select: {
        id: true,
        senderId: true,
        targetId: true,
        shadowProfileId: true,
        location: true,
        matchDetails: true,
      },
    });

    if (!confession || confession.senderId !== user.id || confession.targetId || !confession.shadowProfileId) {
      return NextResponse.json({ error: "This confession cannot be reassigned" }, { status: 400 });
    }

    const target = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true, profileSearchCount: true },
    });
    if (!target) {
      return NextResponse.json({ error: "Selected user no longer exists" }, { status: 400 });
    }

    const compatibleMatches = await findMatches(
      confession.location,
      confession.matchDetails as Record<string, string>
    );
    if (!compatibleMatches.some((match: { id: string }) => match.id === target.id)) {
      return NextResponse.json({ error: "Selected user no longer matches this confession" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      const shadowProfile = await tx.shadowProfile.findUnique({
        where: { id: confession.shadowProfileId! },
        select: {
          id: true,
          searchCount: true,
          claimedByUserId: true,
        },
      });

      if (!shadowProfile) {
        throw new Error("Shadow profile no longer exists");
      }

      if (shadowProfile.claimedByUserId && shadowProfile.claimedByUserId !== target.id) {
        throw new Error("This shadow profile is already linked to another user");
      }

      if (!shadowProfile.claimedByUserId) {
        await tx.shadowProfile.update({
          where: { id: shadowProfile.id },
          data: { claimedByUserId: target.id },
        });

        if (shadowProfile.searchCount > 0) {
          await tx.user.update({
            where: { id: target.id },
            data: {
              profileSearchCount: (target.profileSearchCount ?? 0) + shadowProfile.searchCount,
            },
          });
        }
      }

      await tx.confession.update({
        where: { id: confession.id },
        data: {
          targetId: target.id,
          status: "DELIVERED",
        },
      });
    });

    return NextResponse.json({
      success: true,
      target: {
        id: target.id,
        name: target.name,
      },
    });
  } catch (error) {
    console.error("[Resolve Shadow Confession Error]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
