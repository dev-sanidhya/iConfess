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
    const { flow, location, matchDetails, message, targetPhone, firstName, lastName } = body;

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    const normalizedMatchDetails = normalizeConfessionMatchDetails(
      matchDetails,
      typeof firstName === "string" ? firstName : "",
      typeof lastName === "string" ? lastName : ""
    );

    if (!normalizedMatchDetails.firstName || !normalizedMatchDetails.fullName) {
      return NextResponse.json(
        { error: "First name is required to send a confession" },
        { status: 400 }
      );
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
        if (existingUser.id === user.id) {
          return NextResponse.json({ error: "You cannot confess yourself" }, { status: 400 });
        }

        // Already registered — treat as profile flow
        const alreadySent = await hasExistingConfession(user.id, existingUser.id);
        const canRepeat = await canRepeatConfessForTesting(user, existingUser);
        if (alreadySent && !canRepeat) {
          return NextResponse.json({ error: "You've already confessed this person" }, { status: 400 });
        }

        const confession = await createAndCheckMutual(
          user.id, existingUser.id, null,
          "COLLEGE", normalizedMatchDetails, message, expiresAt, "DELIVERED"
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
          matchDetails: normalizedMatchDetails,
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

    const matches = await findMatches(location, normalizedMatchDetails);

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

    const alreadySent = await hasExistingConfession(user.id, target.id);
    const canRepeat = await canRepeatConfessForTesting(user, target);
    if (alreadySent && !canRepeat) {
      return NextResponse.json({ error: "You've already confessed this person" }, { status: 400 });
    }

    const confession = await createAndCheckMutual(
      user.id, target.id, null,
      location as "COLLEGE" | "SCHOOL" | "WORKPLACE" | "GYM" | "NEIGHBOURHOOD",
      normalizedMatchDetails, message, expiresAt, "DELIVERED"
    );

    return NextResponse.json({ success: true, matchFound: true, confessionId: confession.id, isFree });
  } catch (err) {
    console.error("[Confession Send Error]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

type SessionUser = Pick<NonNullable<Awaited<ReturnType<typeof getSession>>>, "id" | "username" | "phone">;

function normalizeConfessionMatchDetails(
  matchDetails: Record<string, string> | undefined,
  firstNameInput: string,
  lastNameInput: string
) {
  const details = { ...(matchDetails ?? {}) };
  const firstName = firstNameInput.trim() || details.firstName?.trim() || details.fullName?.trim().split(/\s+/)[0] || "";
  const lastName = lastNameInput.trim() || details.lastName?.trim() || "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

  return {
    ...details,
    firstName,
    ...(lastName ? { lastName } : {}),
    fullName,
  };
}

async function hasExistingConfession(senderId: string, targetId: string) {
  const existing = await prisma.confession.findFirst({
    where: { senderId, targetId },
    select: { id: true },
  });

  return Boolean(existing);
}

function getConfiguredTestProfileIdentifiers() {
  const usernames = new Set(
    (process.env.TEST_REPEAT_CONFESSION_USERNAMES ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
  );
  const phones = new Set(
    (process.env.TEST_REPEAT_CONFESSION_PHONES ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
  );

  return { usernames, phones };
}

function isConfiguredTestProfile(user: Pick<SessionUser, "username" | "phone">) {
  const { usernames, phones } = getConfiguredTestProfileIdentifiers();
  return (user.username ? usernames.has(user.username.toLowerCase()) : false) || phones.has(user.phone);
}

async function canRepeatConfessForTesting(sender: SessionUser, target: SessionUser) {
  if (isConfiguredTestProfile(sender) && isConfiguredTestProfile(target)) {
    return true;
  }

  if (process.env.NODE_ENV !== "production") {
    const totalUsers = await prisma.user.count();
    return totalUsers <= 2;
  }

  return false;
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
