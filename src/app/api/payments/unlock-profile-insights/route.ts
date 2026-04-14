import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getLatestPaymentStatusByConfessionIds, getLatestShadowInsightUnlockTimesByShadowIds, isConfessionRecipientActive } from "@/lib/confessions";
import { getPaymentAmount } from "@/lib/payment-catalog.server";
import { createManualPaymentRequest, findExistingPendingManualPayment } from "@/lib/payments";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { targetUserId, targetShadowProfileId, transactionReference } = await req.json();
    const isUserTarget = typeof targetUserId === "string" && targetUserId.length > 0;
    const isShadowTarget = typeof targetShadowProfileId === "string" && targetShadowProfileId.length > 0;

    if (!isUserTarget && !isShadowTarget) {
      return NextResponse.json({ error: "Target is required" }, { status: 400 });
    }

    if (isUserTarget && isShadowTarget) {
      return NextResponse.json({ error: "Choose only one target type" }, { status: 400 });
    }

    if (targetUserId === user.id) {
      return NextResponse.json({ error: "You cannot unlock your own profile insights" }, { status: 400 });
    }

    if (isUserTarget) {
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
    } else if (isShadowTarget) {
      const shadowProfile = await prisma.shadowProfile.findUnique({
        where: { id: targetShadowProfileId },
        select: { id: true, claimedByUserId: true },
      });

      if (!shadowProfile || shadowProfile.claimedByUserId) {
        return NextResponse.json({ error: "Target not found" }, { status: 404 });
      }

      const shadowConfessions = await prisma.confession.findMany({
        where: {
          shadowProfileId: targetShadowProfileId,
          targetId: null,
          status: "PENDING",
          expiresAt: { gt: new Date() },
        },
        select: {
          id: true,
          createdAt: true,
          billingState: true,
          targetId: true,
          isSelfConfession: true,
        },
        orderBy: { createdAt: "desc" },
      });

      if (shadowConfessions.length === 0) {
        return NextResponse.json({ error: "No insights available for this profile yet" }, { status: 400 });
      }

      const paymentStatuses = await getLatestPaymentStatusByConfessionIds(
        shadowConfessions.map((confession) => confession.id),
        "SEND_CONFESSION",
        prisma
      );
      const activeConfessions = shadowConfessions.filter((confession) =>
        isConfessionRecipientActive(confession, paymentStatuses.get(confession.id))
      );
      const latestConfession = activeConfessions[0] ?? null;

      if (!latestConfession) {
        return NextResponse.json({ error: "No insights available for this profile yet" }, { status: 400 });
      }

      const existingUnlockTimes = await getLatestShadowInsightUnlockTimesByShadowIds(
        [targetShadowProfileId],
        user.id,
        prisma
      );
      const existingUnlockAt = existingUnlockTimes.get(targetShadowProfileId) ?? null;
      if (existingUnlockAt && latestConfession.createdAt <= existingUnlockAt) {
        return NextResponse.json({ success: true, alreadyUnlocked: true });
      }
    }

    const existingPending = await findExistingPendingManualPayment({
      userId: user.id,
      type: "UNLOCK_PROFILE_INSIGHTS",
      targetUserId: isUserTarget ? targetUserId : undefined,
      targetShadowProfileId: isShadowTarget ? targetShadowProfileId : undefined,
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
      metadata: {
        ...(isUserTarget ? { targetUserId } : {}),
        ...(isShadowTarget ? { targetShadowProfileId } : {}),
        source: "unlock-profile-insights",
      },
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
