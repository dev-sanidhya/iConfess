import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get("targetUserId");

    if (!targetUserId) {
      return NextResponse.json({ error: "Target user is required" }, { status: 400 });
    }

    const unlocked = await prisma.unlockedProfileInsight.findUnique({
      where: {
        viewerId_targetUserId: {
          viewerId: user.id,
          targetUserId,
        },
      },
    });

    if (!unlocked) {
      return NextResponse.json({ error: "Unlock profile insights first" }, { status: 403 });
    }

    const confessions = await prisma.confession.findMany({
      where: {
        targetId: targetUserId,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        sender: {
          select: {
            name: true,
            gender: true,
            primaryCategory: true,
          },
        },
      },
    });

    return NextResponse.json({
      insights: confessions.map((confession) => ({
        id: confession.id,
        message: confession.message,
        location: confession.location,
        createdAt: confession.createdAt.toISOString(),
        sender: {
          firstName: confession.sender.name.split(" ")[0] ?? confession.sender.name,
          gender: confession.sender.gender,
          primaryCategory: confession.sender.primaryCategory,
        },
      })),
    });
  } catch (error) {
    console.error("[Search Insights Error]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
