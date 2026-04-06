import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { recordPayment } from "@/lib/payments";
import { prisma } from "@/lib/prisma";
import { pricing } from "@/lib/pricing";

export async function POST() {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (user.confessionPageUnlocked) {
      return NextResponse.json({ success: true, alreadyUnlocked: true });
    }

    // In production: verify Razorpay payment_id before unlocking
    // For now (dev), unlock directly
    await prisma.user.update({
      where: { id: user.id },
      data: { confessionPageUnlocked: true },
    });

    await recordPayment({
      userId: user.id,
      type: "UNLOCK_CONFESSION_PAGE",
      amount: pricing.unlockReceivedConfessionPage,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
