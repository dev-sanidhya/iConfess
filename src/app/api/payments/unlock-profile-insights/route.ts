import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getPaymentAmount } from "@/lib/payment-catalog.server";
import { createManualPaymentRequest, findExistingPendingManualPayment } from "@/lib/payments";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { targetUserId, transactionReference } = await req.json();
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

    const latestConfession = await prisma.confession.findFirst({
      where: {
        targetId: targetUserId,
      },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });

    if (!latestConfession) {
      return NextResponse.json({ error: "No insights available for this profile yet" }, { status: 400 });
    }

    const existingUnlock = await prisma.unlockedProfileInsight.findFirst({
      where: {
        viewerId: user.id,
        targetUserId,
      },
      orderBy: { unlockedAt: "desc" },
    });

    if (existingUnlock && latestConfession.createdAt <= existingUnlock.unlockedAt) {
      return NextResponse.json({ success: true, alreadyUnlocked: true });
    }

    const existingPending = await findExistingPendingManualPayment({
      userId: user.id,
      type: "UNLOCK_PROFILE_INSIGHTS",
      targetUserId,
    });
    if (existingPending) {
      return NextResponse.json({
        success: true,
        pendingReview: true,
        alreadyPending: true,
        paymentId: existingPending.id,
      });
    }

    const viewInsightsAmount = await getPaymentAmount("viewInsights");
    const payment = await createManualPaymentRequest({
      userId: user.id,
      type: "UNLOCK_PROFILE_INSIGHTS",
      amount: viewInsightsAmount,
      transactionReference,
      metadata: { targetUserId, source: "unlock-profile-insights" },
    });

    return NextResponse.json({ success: true, pendingReview: true, paymentId: payment.id });
  } catch (error) {
    console.error("[Unlock Profile Insights Error]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
