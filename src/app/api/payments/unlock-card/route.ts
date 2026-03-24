import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!user.confessionPageUnlocked) {
      return NextResponse.json({ error: "Unlock the confession page first" }, { status: 400 });
    }

    const { confessionId } = await req.json();

    const confession = await prisma.confession.findUnique({ where: { id: confessionId } });
    if (!confession || confession.targetId !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // In production: verify Razorpay payment before creating UnlockedCard
    const existing = await prisma.unlockedCard.findUnique({
      where: { userId_confessionId: { userId: user.id, confessionId } },
    });
    if (existing) return NextResponse.json({ success: true, alreadyUnlocked: true });

    await prisma.$transaction([
      prisma.unlockedCard.create({ data: { userId: user.id, confessionId } }),
      prisma.confession.update({ where: { id: confessionId }, data: { status: "OPENED" } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
