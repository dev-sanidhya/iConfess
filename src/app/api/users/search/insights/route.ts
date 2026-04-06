import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStoredSharedProfileSnapshot } from "@/lib/shared-profile-context";

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get("targetUserId");

    if (!targetUserId) {
      return NextResponse.json({ error: "Target user is required" }, { status: 400 });
    }

    const unlocked = await prisma.unlockedProfileInsight.findFirst({
      where: {
        viewerId: user.id,
        targetUserId,
      },
      orderBy: { unlockedAt: "desc" },
    });

    if (!unlocked) {
      return NextResponse.json({ error: "Unlock profile insights first" }, { status: 403 });
    }

    const confessions = await prisma.confession.findMany({
      where: {
        targetId: targetUserId,
      },
      orderBy: { createdAt: "desc" },
      include: {
        sender: {
          select: { primaryCategory: true },
        },
      },
    });

    const insights = confessions.map((confession) => {
        const sharedProfileSnapshot = getStoredSharedProfileSnapshot(confession.matchDetails as Record<string, unknown>);

        return {
          id: confession.id,
          isUnlocked: confession.createdAt <= unlocked.unlockedAt,
          sender: {
            category: sharedProfileSnapshot?.label ?? confession.sender.primaryCategory,
            details: sharedProfileSnapshot?.details ?? [],
          },
        };
      });

    return NextResponse.json({
      insights,
      unlockedInsightCount: insights.filter((insight) => insight.isUnlocked).length,
      lockedInsightCount: insights.filter((insight) => !insight.isUnlocked).length,
    });
  } catch (error) {
    console.error("[Search Insights Error]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
