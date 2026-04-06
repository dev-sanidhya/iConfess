import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { recordPayment } from "@/lib/payments";
import { prisma } from "@/lib/prisma";
import { pricing } from "@/lib/pricing";

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { confessionId } = await req.json();

    const confession = await prisma.confession.findUnique({ where: { id: confessionId } });
    if (!confession || confession.targetId !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // In production: verify Razorpay payment before creating UnlockedCard
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

    await prisma.$transaction(async (tx) => {
      if (!user.confessionPageUnlocked) {
        await tx.user.update({
          where: { id: user.id },
          data: { confessionPageUnlocked: true },
        });
      }

      await tx.unlockedCard.create({ data: { userId: user.id, confessionId } });
      await tx.confession.update({ where: { id: confessionId }, data: { status: "OPENED" } });
    });

    if (!user.confessionPageUnlocked) {
      await recordPayment({
        userId: user.id,
        type: "UNLOCK_CONFESSION_PAGE",
        amount: pricing.unlockReceivedConfessionPage,
        metadata: { confessionId, bundledWithCardUnlock: true },
      });
    }

    await recordPayment({
      userId: user.id,
      type: "UNLOCK_CONFESSION_CARD",
      amount: pricing.unlockReceivedConfessionCard,
      metadata: { confessionId },
    });

    return NextResponse.json({ success: true, pageUnlocked: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
