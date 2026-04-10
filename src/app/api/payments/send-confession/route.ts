import { NextRequest, NextResponse } from "next/server";
import { PaymentStatus } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { getPaymentAmount } from "@/lib/payment-catalog.server";
import { createManualPaymentRequest, findExistingPendingManualPayment } from "@/lib/payments";
import { prisma } from "@/lib/prisma";

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
        senderId: true,
        targetId: true,
        targetPhone: true,
        status: true,
        isSelfConfession: true,
      },
    });

    if (!confession || confession.senderId !== user.id || confession.isSelfConfession) {
      return NextResponse.json({ error: "This card cannot be paid right now" }, { status: 400 });
    }

    if (confession.status !== "PENDING") {
      return NextResponse.json({ error: "This confession no longer needs payment" }, { status: 400 });
    }

    const existingPending = await findExistingPendingManualPayment({
      userId: user.id,
      type: "SEND_CONFESSION",
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

    const sendPayments = await prisma.payment.findMany({
      where: {
        userId: user.id,
        type: "SEND_CONFESSION",
      },
      orderBy: { createdAt: "desc" },
      select: {
        status: true,
        metadata: true,
      },
    });

    const matchingLatestPayment =
      sendPayments.find((payment) => {
        if (!payment.metadata || typeof payment.metadata !== "object" || Array.isArray(payment.metadata)) {
          return false;
        }

        return (payment.metadata as Record<string, unknown>).confessionId === confessionId;
      }) ?? null;

    if (matchingLatestPayment?.status === PaymentStatus.SUCCESS) {
      return NextResponse.json({ error: "This confession payment is already approved" }, { status: 400 });
    }

    const sendConfessionAmount = await getPaymentAmount("sendConfession");
    const payment = await createManualPaymentRequest({
      userId: user.id,
      type: "SEND_CONFESSION",
      amount: sendConfessionAmount,
      transactionReference,
      metadata: {
        confessionId,
        deliverOnSuccess: Boolean(confession.targetId),
        source: "send-confession-retry",
      },
    });

    return NextResponse.json({ success: true, pendingReview: true, paymentId: payment.id });
  } catch (error) {
    console.error("[Retry Send Payment Error]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
