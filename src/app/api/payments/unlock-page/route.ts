import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createManualPaymentRequest, findExistingPendingManualPayment } from "@/lib/payments";
import { pricing } from "@/lib/pricing";

export async function POST(req: Request) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (user.confessionPageUnlocked) {
      return NextResponse.json({ success: true, alreadyUnlocked: true });
    }

    const existingPending = await findExistingPendingManualPayment({
      userId: user.id,
      type: "UNLOCK_CONFESSION_PAGE",
    });
    if (existingPending) {
      return NextResponse.json({
        success: true,
        pendingReview: true,
        paymentId: existingPending.id,
      });
    }

    const { transactionReference } = await req.json();
    const payment = await createManualPaymentRequest({
      userId: user.id,
      type: "UNLOCK_CONFESSION_PAGE",
      amount: pricing.unlockReceivedConfessionPage,
      transactionReference,
      metadata: { source: "unlock-page" },
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
