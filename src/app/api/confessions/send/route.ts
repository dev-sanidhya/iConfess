import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { findMatches } from "@/lib/matching";
import { prisma } from "@/lib/prisma";
import { addDays } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { flow, location, matchDetails, message, targetPhone } = body;

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    const sentCount = await prisma.confession.count({ where: { senderId: user.id } });
    const isFree = sentCount === 0;

    if (!isFree) {
      // Payment check — Razorpay integration will go here
      // For now we proceed; in production verify payment first
    }

    const expiresAt = addDays(new Date(), 90);

    // ── Flow 2: Phone number ──────────────────────────────────────
    if (flow === "phone") {
      if (!targetPhone || !/^\+91\d{10}$/.test(targetPhone)) {
        return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
      }

      const existingUser = await prisma.user.findUnique({ where: { phone: targetPhone } });

      if (existingUser) {
        // Already registered — treat as profile flow
        const alreadySent = await prisma.confession.findFirst({
          where: { senderId: user.id, targetId: existingUser.id },
        });
        if (alreadySent) {
          return NextResponse.json({ error: "You've already confessed this person" }, { status: 400 });
        }

        const confession = await createAndCheckMutual(
          user.id, existingUser.id, null,
          "COLLEGE", {}, message, expiresAt, "DELIVERED"
        );
        return NextResponse.json({ success: true, matchFound: true, confessionId: confession.id, isFree });
      }

      // Unregistered — queue via phone
      const confession = await prisma.confession.create({
        data: {
          senderId: user.id,
          targetPhone,
          message,
          location: "COLLEGE",
          matchDetails: {},
          status: "PENDING",
          expiresAt,
        },
      });

      // In production: send WhatsApp via Meta API
      console.log(`[DEV] WhatsApp to ${targetPhone}: Someone has a confession for you on iConfess!`);

      return NextResponse.json({ success: true, matchFound: false, confessionId: confession.id, isFree });
    }

    // ── Flow 1: Profile matching ─────────────────────────────────
    if (!location || !matchDetails) {
      return NextResponse.json({ error: "Location details required" }, { status: 400 });
    }

    const matches = await findMatches(location, matchDetails);

    if (matches.length === 0) {
      const confession = await prisma.confession.create({
        data: { senderId: user.id, message, location, matchDetails, status: "PENDING", expiresAt },
      });
      return NextResponse.json({ success: true, matchFound: false, confessionId: confession.id, isFree });
    }

    if (matches.length > 1) {
      return NextResponse.json({
        success: false,
        multipleMatches: true,
        count: matches.length,
        error: "Multiple people match. Please provide more specific details.",
      }, { status: 409 });
    }

    const target = matches[0];
    if (target.id === user.id) {
      return NextResponse.json({ error: "You cannot confess yourself" }, { status: 400 });
    }

    const alreadySent = await prisma.confession.findFirst({
      where: { senderId: user.id, targetId: target.id },
    });
    if (alreadySent) {
      return NextResponse.json({ error: "You've already confessed this person" }, { status: 400 });
    }

    const confession = await createAndCheckMutual(
      user.id, target.id, null,
      location as "COLLEGE" | "SCHOOL" | "WORKPLACE" | "GYM" | "NEIGHBOURHOOD",
      matchDetails, message, expiresAt, "DELIVERED"
    );

    return NextResponse.json({ success: true, matchFound: true, confessionId: confession.id, isFree });
  } catch (err) {
    console.error("[Confession Send Error]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── Create confession + auto-detect mutual ────────────────────────
async function createAndCheckMutual(
  senderId: string,
  targetId: string,
  targetPhone: string | null,
  location: "COLLEGE" | "SCHOOL" | "WORKPLACE" | "GYM" | "NEIGHBOURHOOD",
  matchDetails: Record<string, string>,
  message: string,
  expiresAt: Date,
  status: "DELIVERED" | "PENDING"
) {
  const confession = await prisma.confession.create({
    data: { senderId, targetId, targetPhone, message, location, matchDetails, status, expiresAt },
  });

  // Check if target has already confessed this sender (mutual)
  const reverse = await prisma.confession.findFirst({
    where: { senderId: targetId, targetId: senderId },
  });

  if (reverse) {
    await prisma.confession.updateMany({
      where: { id: { in: [confession.id, reverse.id] } },
      data: { mutualDetected: true },
    });
  }

  return confession;
}
