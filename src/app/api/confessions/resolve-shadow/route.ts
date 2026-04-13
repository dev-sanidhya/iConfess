import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { deleteShadowProfileIfEmpty } from "@/lib/shadow-profiles";
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
      select: { id: true, name: true },
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

    await prisma.confession.update({
      where: { id: confession.id },
      data: {
        targetId: target.id,
        status: "DELIVERED",
        shadowProfileId: null,
      },
    });

    await deleteShadowProfileIfEmpty(confession.shadowProfileId, prisma);

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
