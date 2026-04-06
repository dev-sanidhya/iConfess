import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { recordPayment } from "@/lib/payments";
import { prisma } from "@/lib/prisma";
import { pricing } from "@/lib/pricing";

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { targetUserId } = await req.json();
    if (!targetUserId || typeof targetUserId !== "string") {
      return NextResponse.json({ error: "Target user is required" }, { status: 400 });
    }

    if (targetUserId === user.id) {
      return NextResponse.json({ error: "You cannot unlock your own profile insights" }, { status: 400 });
    }

    const target = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true },
    });
    if (!target) {
      return NextResponse.json({ error: "Target not found" }, { status: 404 });
    }

    await prisma.unlockedProfileInsight.create({
      data: {
        viewerId: user.id,
        targetUserId,
      },
    });

    await recordPayment({
      userId: user.id,
      type: "UNLOCK_PROFILE_INSIGHTS",
      amount: pricing.viewInsights,
      metadata: { targetUserId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Unlock Profile Insights Error]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
