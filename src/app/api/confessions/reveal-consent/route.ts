import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { confessionId } = await req.json();

    const confession = await prisma.confession.findUnique({ where: { id: confessionId } });
    if (!confession) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!confession.mutualDetected) return NextResponse.json({ error: "No mutual detected" }, { status: 400 });

    const isSender = confession.senderId === user.id;
    const isTarget = confession.targetId === user.id;
    if (!isSender && !isTarget) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const update = isSender
      ? { senderRevealConsent: true }
      : { targetRevealConsent: true };

    const updated = await prisma.confession.update({
      where: { id: confessionId },
      data: update,
    });

    // Check if both consented
    if (updated.senderRevealConsent && updated.targetRevealConsent) {
      await prisma.confession.update({
        where: { id: confessionId },
        data: { revealedAt: new Date() },
      });

      // Fetch both users' contact info to share
      const sender = await prisma.user.findUnique({ where: { id: confession.senderId }, select: { name: true, phone: true } });
      const target = await prisma.user.findUnique({ where: { id: confession.targetId! }, select: { name: true, phone: true } });

      // In production: send each user the other's contact details via notification
      console.log(`[DEV] Reveal: ${sender?.name} (${sender?.phone}) ↔ ${target?.name} (${target?.phone})`);

      return NextResponse.json({ success: true, revealed: true });
    }

    return NextResponse.json({ success: true, revealed: false });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
