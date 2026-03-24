import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { confessionId, reply } = await req.json();
    if (!reply?.trim()) return NextResponse.json({ error: "Reply cannot be empty" }, { status: 400 });

    const confession = await prisma.confession.findUnique({ where: { id: confessionId } });
    if (!confession) return NextResponse.json({ error: "Confession not found" }, { status: 404 });
    if (confession.targetId !== user.id) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    if (confession.reply) return NextResponse.json({ error: "Already replied" }, { status: 400 });

    await prisma.confession.update({
      where: { id: confessionId },
      data: { reply: reply.trim(), repliedAt: new Date(), status: "REPLIED" },
    });

    // In production: notify the sender via in-app notification / push
    console.log(`[DEV] Notify sender ${confession.senderId}: Your confession was replied to.`);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
