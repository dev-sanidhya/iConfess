import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { recordPayment } from "@/lib/payments";
import { prisma } from "@/lib/prisma";
import { pricing } from "@/lib/pricing";
import {
  buildSelfClaimSnapshot,
  confessionMatchesSelfClaim,
  convertConfessionToSelf,
} from "@/lib/confessions";

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { confessionId } = await req.json();
    if (!confessionId || typeof confessionId !== "string") {
      return NextResponse.json({ error: "Confession id is required" }, { status: 400 });
    }

    const confession = await prisma.confession.findUnique({
      where: { id: confessionId },
      select: {
        id: true,
        senderId: true,
        status: true,
        isSelfConfession: true,
        billingState: true,
        targetPhone: true,
        location: true,
        matchDetails: true,
      },
    });

    if (!confession || confession.senderId !== user.id || confession.status !== "PENDING" || confession.isSelfConfession) {
      return NextResponse.json({ error: "This card cannot be converted right now" }, { status: 400 });
    }

    const selfClaimSnapshot = buildSelfClaimSnapshot(user);
    if (!confessionMatchesSelfClaim(confession, selfClaimSnapshot)) {
      return NextResponse.json({ error: "Your current profile details no longer match this card" }, { status: 400 });
    }

    if (confession.billingState !== "FREE") {
      return NextResponse.json({ error: "This card does not need self-confession payment" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await convertConfessionToSelf(confession.id, user.id, tx);
    });

    await recordPayment({
      userId: user.id,
      type: "SELF_CONFESSION",
      amount: pricing.selfConfession,
      metadata: { confessionId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Self Confession Payment Error]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
