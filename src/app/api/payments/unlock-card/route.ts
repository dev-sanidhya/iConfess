import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getPaymentAmount } from "@/lib/payment-catalog.server";
import { createManualPaymentRequest, findExistingPendingManualPayment } from "@/lib/payments";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { confessionId, transactionReference } = await req.json();

    const confession = await prisma.confession.findUnique({ where: { id: confessionId } });
    if (!confession || confession.targetId !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const existing = await prisma.unlockedCard.findUnique({
      where: { userId_confessionId: { userId: user.id, confessionId } },
    });
    if (existing) {
      return NextResponse.json({
        success: true,
        alreadyUnlocked: true,
        pageUnlocked: user.confessionPageUnlocked,
      });
    }

    const existingPending = await findExistingPendingManualPayment({
      userId: user.id,
      type: "UNLOCK_CONFESSION_CARD",
      confessionId,
    });
    if (existingPending) {
      return NextResponse.json({
        success: true,
        pendingReview: true,
        alreadyPending: true,
        paymentId: existingPending.id,
      });
    }

    const [unlockCardAmount, unlockCardWithPageAmount] = await Promise.all([
      getPaymentAmount("unlockReceivedConfessionCard"),
      getPaymentAmount("unlockReceivedConfessionCardWithPage"),
    ]);

    const payment = await createManualPaymentRequest({
      userId: user.id,
      type: "UNLOCK_CONFESSION_CARD",
      amount: user.confessionPageUnlocked
        ? unlockCardAmount
        : unlockCardWithPageAmount,
      transactionReference,
      metadata: {
        confessionId,
        bundledPageUnlock: !user.confessionPageUnlocked,
        source: "unlock-card",
      },
    });

    return NextResponse.json({ success: true, pendingReview: true, paymentId: payment.id });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
