import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  applyIdentityRevealPayment,
  dbSupportsIdentityRevealPaymentType,
  isMissingIdentityRevealPaymentType,
  userHasApprovedRevealPayment,
} from "@/lib/reveal-identity";

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
        targetId: true,
        mutualDetected: true,
        senderRevealConsent: true,
        targetRevealConsent: true,
        revealedAt: true,
      },
    });

    if (!confession) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!confession.mutualDetected) return NextResponse.json({ error: "No mutual detected" }, { status: 400 });
    if (confession.targetId !== user.id) {
      return NextResponse.json({ error: "Use the received mutual confession card for identity reveal" }, { status: 403 });
    }

    if (!(await dbSupportsIdentityRevealPaymentType())) {
      return NextResponse.json(
        { error: "Identity reveal payments are not available yet. Run the latest Prisma migration first." },
        { status: 503 }
      );
    }

    const approvedPayment = await userHasApprovedRevealPayment(user.id, confessionId);
    if (!approvedPayment) {
      return NextResponse.json({ error: "Identity reveal payment must be approved before consent is recorded" }, { status: 400 });
    }

    await applyIdentityRevealPayment(confessionId, user.id, {
      confessionId,
      bundledPageUnlock: false,
      bundledCardUnlock: false,
    });

    const refreshed = await prisma.confession.findUnique({
      where: { id: confessionId },
      select: {
        senderRevealConsent: true,
        targetRevealConsent: true,
        revealedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      revealed: Boolean(refreshed?.revealedAt),
      senderRevealConsent: refreshed?.senderRevealConsent ?? confession.senderRevealConsent,
      targetRevealConsent: refreshed?.targetRevealConsent ?? confession.targetRevealConsent,
      revealedAt: refreshed?.revealedAt?.toISOString() ?? null,
    });
  } catch (err) {
    if (isMissingIdentityRevealPaymentType(err)) {
      return NextResponse.json(
        { error: "Identity reveal payments are not available yet. Run the latest Prisma migration first." },
        { status: 503 }
      );
    }

    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
