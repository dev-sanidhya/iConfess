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

    const reverse = await prisma.confession.findFirst({
      where: {
        senderId: confession.targetId ?? undefined,
        targetId: confession.senderId,
      },
    });

    const updates: Promise<unknown>[] = [];
    if (isSender) {
      updates.push(prisma.confession.update({
        where: { id: confessionId },
        data: { senderRevealConsent: true },
      }));
      if (reverse) {
        updates.push(prisma.confession.update({
          where: { id: reverse.id },
          data: { targetRevealConsent: true },
        }));
      }
    } else {
      updates.push(prisma.confession.update({
        where: { id: confessionId },
        data: { targetRevealConsent: true },
      }));
      if (reverse) {
        updates.push(prisma.confession.update({
          where: { id: reverse.id },
          data: { senderRevealConsent: true },
        }));
      }
    }

    await Promise.all(updates);

    const refreshed = await prisma.confession.findUnique({
      where: { id: confessionId },
    });

    if (refreshed?.senderRevealConsent && refreshed.targetRevealConsent) {
      const revealTime = new Date();
      const ids = [confessionId, reverse?.id].filter(Boolean) as string[];
      await prisma.confession.updateMany({
        where: { id: { in: ids } },
        data: { revealedAt: revealTime },
      });

      // Fetch both users' contact info to share
      const sender = await prisma.user.findUnique({ where: { id: confession.senderId }, select: { name: true, phone: true } });
      const target = await prisma.user.findUnique({ where: { id: confession.targetId! }, select: { name: true, phone: true } });

      // In production: send each user the other's contact details via notification
      console.log(`[DEV] Reveal: ${sender?.name} (${sender?.phone}) ↔ ${target?.name} (${target?.phone})`);

      return NextResponse.json({
        success: true,
        revealed: true,
        senderRevealConsent: true,
        targetRevealConsent: true,
        revealedAt: revealTime.toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      revealed: false,
      senderRevealConsent: refreshed?.senderRevealConsent ?? confession.senderRevealConsent,
      targetRevealConsent: refreshed?.targetRevealConsent ?? confession.targetRevealConsent,
      revealedAt: refreshed?.revealedAt?.toISOString() ?? null,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
