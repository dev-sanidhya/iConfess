import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getPaymentCatalog } from "@/lib/payment-catalog.server";
import { createManualPaymentRequest, findExistingPendingManualPayment } from "@/lib/payments";
import { prisma } from "@/lib/prisma";
import {
  dbSupportsIdentityRevealPaymentType,
  getIdentityRevealPaymentConfig,
  isMissingIdentityRevealPaymentType,
  userHasApprovedRevealPayment,
} from "@/lib/reveal-identity";

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { confessionId, transactionReference } = await req.json();
    if (!confessionId || typeof confessionId !== "string") {
      return NextResponse.json({ error: "Confession id is required" }, { status: 400 });
    }

    const confession = await prisma.confession.findUnique({
      where: { id: confessionId },
      select: {
        id: true,
        targetId: true,
        mutualDetected: true,
        targetRevealConsent: true,
        revealedAt: true,
      },
    });

    if (!confession || confession.targetId !== user.id) {
      return NextResponse.json({ error: "Confession not found" }, { status: 404 });
    }

    if (!confession.mutualDetected) {
      return NextResponse.json({ error: "Reveal identity is only available for mutual confessions" }, { status: 400 });
    }

    if (!(await dbSupportsIdentityRevealPaymentType())) {
      return NextResponse.json(
        { error: "Identity reveal payments are not available yet. Run the latest Prisma migration first." },
        { status: 503 }
      );
    }

    const approvedPayment = await userHasApprovedRevealPayment(user.id, confessionId);
    if (confession.revealedAt || (confession.targetRevealConsent && approvedPayment)) {
      return NextResponse.json({ success: true, alreadyConsented: true });
    }

    const unlockedCard = await prisma.unlockedCard.findUnique({
      where: { userId_confessionId: { userId: user.id, confessionId } },
      select: { id: true },
    });

    const existingPending = await findExistingPendingManualPayment({
      userId: user.id,
      type: "IDENTITY_REVEAL",
      confessionId,
    });
    if (existingPending) {
      return NextResponse.json({
        success: true,
        alreadyPending: true,
        pendingReview: true,
        paymentId: existingPending.id,
      });
    }

    const paymentCatalog = await getPaymentCatalog();
    const paymentConfig = getIdentityRevealPaymentConfig(
      user.confessionPageUnlocked,
      Boolean(unlockedCard),
      paymentCatalog
    );

    const payment = await createManualPaymentRequest({
      userId: user.id,
      type: "IDENTITY_REVEAL",
      amount: paymentConfig.amount,
      transactionReference,
      metadata: {
        confessionId,
        bundledPageUnlock: !user.confessionPageUnlocked,
        bundledCardUnlock: !unlockedCard,
        source: "identity-reveal",
      },
    });

    return NextResponse.json({ success: true, pendingReview: true, paymentId: payment.id });
  } catch (error) {
    if (isMissingIdentityRevealPaymentType(error)) {
      return NextResponse.json(
        { error: "Identity reveal payments are not available yet. Run the latest Prisma migration first." },
        { status: 503 }
      );
    }

    console.error("[Identity Reveal Payment Error]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
