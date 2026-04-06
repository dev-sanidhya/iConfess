import { NextRequest, NextResponse } from "next/server";
import { Gender, Prisma } from "@prisma/client";
import { getSession, normalizeSocialHandle } from "@/lib/auth";
import { findMatches } from "@/lib/matching";
import { recordPayment } from "@/lib/payments";
import { pricing } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";
import { buildSharedProfileOptionsFromUser, getSharedProfileOptionByCategory } from "@/lib/shared-profile-context";
import { addDays } from "@/lib/utils";
import {
  countSentConfessionsToOthers,
  normalizeComparableFullName,
  normalizeComparableHandle,
} from "@/lib/confessions";

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { flow, location, matchDetails, message, targetPhone, firstName, lastName, platform, handle, targetUserId, sharedProfileCategory, selfGenderOverride } = body;

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

    const selectedSharedProfile = getSharedProfileOptionByCategory(
      buildSharedProfileOptionsFromUser(user),
      typeof sharedProfileCategory === "string" ? sharedProfileCategory : null
    );

    if (!selectedSharedProfile) {
      return NextResponse.json(
        { error: "Choose which of your profile fields connects you to this person" },
        { status: 400 }
      );
    }

    const confessionMatchDetails = {
      ...normalizedMatchDetails,
      sharedProfileCategory: selectedSharedProfile.category,
      sharedProfileLabel: selectedSharedProfile.label,
      sharedProfileDetails: selectedSharedProfile.details,
    };

    const sentCount = await countSentConfessionsToOthers(user.id, prisma);
    const isFree = sentCount === 0;
    const normalizedUserFullName = normalizeComparableFullName(user.name);
    const validSelfGenderOverride = Object.values(Gender).includes(selfGenderOverride as Gender)
      ? (selfGenderOverride as Gender)
      : null;

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
      const isSelfConfession =
        normalizeComparableFullName(normalizedMatchDetails.fullName) === normalizedUserFullName &&
        targetPhone === user.phone;

      if (existingUser) {
        if (existingUser.id === user.id && !isSelfConfession) {
          return NextResponse.json({ error: "Use your own full name to send a confession to yourself" }, { status: 400 });
        }

        if (existingUser.id === user.id) {
          const confession = await createAndCheckMutual(
            user.id,
            user.id,
            null,
            "COLLEGE",
            confessionMatchDetails,
            message,
            expiresAt,
            "DELIVERED",
            {
              isSelfConfession: true,
              billingCategory: "CONFESSION_TO_YOURSELF",
              billingState: "PAID",
              selfGenderOverride: validSelfGenderOverride,
            }
          );
          return NextResponse.json({
            success: true,
            matchFound: true,
            confessionId: confession.id,
            isFree: false,
            deliveryMode: "delivered",
          });
        }

        // Already registered — treat as profile flow
        const alreadySent = await hasExistingConfession(user.id, existingUser.id);
        const canRepeat = await canRepeatConfessForTesting(user, existingUser);
        if (alreadySent && !canRepeat) {
          return NextResponse.json({ error: "You've already confessed this person" }, { status: 400 });
        }

        const confession = await createAndCheckMutual(
          user.id, existingUser.id, null,
          "COLLEGE", confessionMatchDetails, message, expiresAt, "DELIVERED",
          { isSelfConfession: false, billingCategory: "CONFESSION_TO_OTHERS", billingState: isFree ? "FREE" : "PAID" }
        );
        await recordSendPaymentIfNeeded(user.id, isFree, confession.id, "phone");
        return NextResponse.json({
          success: true,
          matchFound: true,
          confessionId: confession.id,
          isFree,
          deliveryMode: "delivered",
        });
      }

      // Unregistered — queue via phone
      const confession = await prisma.confession.create({
        data: {
          senderId: user.id,
            targetPhone,
            message,
            location: "COLLEGE",
            matchDetails: confessionMatchDetails as Prisma.InputJsonValue,
            status: "PENDING",
            expiresAt,
            billingCategory: "CONFESSION_TO_OTHERS",
          billingState: isFree ? "FREE" : "PAID",
        },
      });
      await recordSendPaymentIfNeeded(user.id, isFree, confession.id, "phone");

      // In production: send WhatsApp via Meta API
      console.log(`[DEV] WhatsApp to ${targetPhone}: Someone has a confession for you on iConfess!`);

      return NextResponse.json({
        success: true,
        matchFound: false,
        confessionId: confession.id,
        isFree,
        deliveryMode: "phone_outreach",
      });
    }

    if (flow === "social") {
      const normalizedHandle = normalizeSocialHandle(typeof handle === "string" ? handle : "");

      if (!normalizedHandle || (platform !== "instagram" && platform !== "snapchat")) {
        return NextResponse.json({ error: "Invalid social handle" }, { status: 400 });
      }

      const existingUser = await prisma.user.findFirst({
        where: platform === "instagram"
          ? { instagramHandle: normalizedHandle }
          : { snapchatHandle: normalizedHandle },
      });
      const ownHandle = platform === "instagram" ? user.instagramHandle : user.snapchatHandle;
      const isSelfConfession =
        normalizeComparableFullName(normalizedMatchDetails.fullName) === normalizedUserFullName &&
        normalizeComparableHandle(normalizedHandle) === normalizeComparableHandle(ownHandle ?? "");

      if (!existingUser) {
        const confession = await prisma.confession.create({
          data: {
            senderId: user.id,
            message,
            location: "COLLEGE",
            matchDetails: {
              ...confessionMatchDetails,
              platform,
              handle: normalizedHandle,
            } as Prisma.InputJsonValue,
            status: "PENDING",
            expiresAt,
            billingCategory: "CONFESSION_TO_OTHERS",
            billingState: isFree ? "FREE" : "PAID",
          },
        });
        await recordSendPaymentIfNeeded(user.id, isFree, confession.id, "social");

        return NextResponse.json({
          success: true,
          matchFound: false,
          confessionId: confession.id,
          isFree,
          deliveryMode: "pending_registration",
        });
      }

      if (existingUser.id === user.id && !isSelfConfession) {
        return NextResponse.json({ error: "Use your own full name to send a confession to yourself" }, { status: 400 });
      }

      if (existingUser.id === user.id) {
        const confession = await createAndCheckMutual(
          user.id,
          user.id,
          null,
          "COLLEGE",
          {
            ...confessionMatchDetails,
            platform,
            handle: normalizedHandle,
          },
          message,
          expiresAt,
          "DELIVERED",
          {
            isSelfConfession: true,
            billingCategory: "CONFESSION_TO_YOURSELF",
            billingState: "PAID",
            selfGenderOverride: validSelfGenderOverride,
          }
        );

        return NextResponse.json({
          success: true,
          matchFound: true,
          confessionId: confession.id,
          isFree: false,
          deliveryMode: "delivered",
        });
      }

      const alreadySent = await hasExistingConfession(user.id, existingUser.id);
      const canRepeat = await canRepeatConfessForTesting(user, existingUser);
      if (alreadySent && !canRepeat) {
        return NextResponse.json({ error: "You've already confessed this person" }, { status: 400 });
      }

      const confession = await createAndCheckMutual(
        user.id,
        existingUser.id,
        null,
        "COLLEGE",
        {
          ...confessionMatchDetails,
          platform,
          handle: normalizedHandle,
        },
        message,
        expiresAt,
        "DELIVERED",
        { isSelfConfession: false, billingCategory: "CONFESSION_TO_OTHERS", billingState: isFree ? "FREE" : "PAID" }
      );

      return NextResponse.json({
        success: true,
        matchFound: true,
        confessionId: confession.id,
        isFree,
        deliveryMode: "delivered",
      });
    }

    // ── Flow 1: Profile matching ─────────────────────────────────
    if (!location || !matchDetails) {
      return NextResponse.json({ error: "Location details required" }, { status: 400 });
    }

    const matches = await findMatches(location, normalizedMatchDetails);
    const uniqueMatches = [...new Map(matches.map((match) => [match.id, match])).values()];

    if (typeof targetUserId === "string" && targetUserId.trim()) {
      const target = uniqueMatches.find((match) => match.id === targetUserId.trim());

      if (!target) {
        return NextResponse.json({ error: "Selected user no longer matches these details" }, { status: 400 });
      }

      if (target.id === user.id) {
        const confession = await createAndCheckMutual(
          user.id,
          user.id,
          null,
          location as "COLLEGE" | "SCHOOL" | "WORKPLACE" | "GYM" | "NEIGHBOURHOOD",
          confessionMatchDetails,
          message,
          expiresAt,
          "DELIVERED",
          {
            isSelfConfession: true,
            billingCategory: "CONFESSION_TO_YOURSELF",
            billingState: "PAID",
            selfGenderOverride: validSelfGenderOverride,
          }
        );

        return NextResponse.json({
          success: true,
          matchFound: true,
          confessionId: confession.id,
          isFree: false,
          deliveryMode: "delivered",
        });
      }

      const alreadySent = await hasExistingConfession(user.id, target.id);
      const canRepeat = await canRepeatConfessForTesting(user, target);
      if (alreadySent && !canRepeat) {
        return NextResponse.json({ error: "You've already confessed this person" }, { status: 400 });
      }

      const confession = await createAndCheckMutual(
        user.id,
        target.id,
        null,
        location as "COLLEGE" | "SCHOOL" | "WORKPLACE" | "GYM" | "NEIGHBOURHOOD",
        confessionMatchDetails,
        message,
        expiresAt,
        "DELIVERED",
        { isSelfConfession: false, billingCategory: "CONFESSION_TO_OTHERS", billingState: isFree ? "FREE" : "PAID" }
      );
      await recordSendPaymentIfNeeded(user.id, isFree, confession.id, "profile");

      return NextResponse.json({
        success: true,
        matchFound: true,
        confessionId: confession.id,
        isFree,
        deliveryMode: "delivered",
      });
    }

    const confession = await prisma.confession.create({
      data: {
        senderId: user.id,
        message,
        location,
        matchDetails: confessionMatchDetails as Prisma.InputJsonValue,
        status: "PENDING",
        expiresAt,
        billingCategory: "CONFESSION_TO_OTHERS",
        billingState: isFree ? "FREE" : "PAID",
      },
    });
    await recordSendPaymentIfNeeded(user.id, isFree, confession.id, "profile");

    return NextResponse.json({
      success: true,
      matchFound: false,
      confessionId: confession.id,
      isFree,
      deliveryMode: "pending_registration",
    });
  } catch (err) {
    console.error("[Confession Send Error]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

type SessionUser = Pick<NonNullable<Awaited<ReturnType<typeof getSession>>>, "id" | "username" | "phone">;

function normalizeConfessionMatchDetails(
  matchDetails: Record<string, unknown> | undefined,
  firstNameInput: string,
  lastNameInput: string
) {
  const details = { ...(matchDetails ?? {}) };
  const existingFirstName = typeof details.firstName === "string" ? details.firstName.trim() : "";
  const existingFullName = typeof details.fullName === "string" ? details.fullName.trim() : "";
  const existingLastName = typeof details.lastName === "string" ? details.lastName.trim() : "";
  const firstName = firstNameInput.trim() || existingFirstName || existingFullName.split(/\s+/)[0] || "";
  const lastName = lastNameInput.trim() || existingLastName || "";
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
    where: { senderId, targetId, isSelfConfession: false },
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
async function recordSendPaymentIfNeeded(
  userId: string,
  isFree: boolean,
  confessionId: string,
  flow: "phone" | "social" | "profile"
) {
  if (isFree) {
    return;
  }

  await recordPayment({
    userId,
    type: "SEND_CONFESSION",
    amount: pricing.sendConfession,
    metadata: { confessionId, flow },
  });
}

async function createAndCheckMutual(
  senderId: string,
  targetId: string,
  targetPhone: string | null,
  location: "COLLEGE" | "SCHOOL" | "WORKPLACE" | "GYM" | "NEIGHBOURHOOD",
  matchDetails: Record<string, unknown>,
  message: string,
  expiresAt: Date,
  status: "DELIVERED" | "PENDING",
  options: {
    isSelfConfession: boolean;
    billingCategory: "CONFESSION_TO_OTHERS" | "CONFESSION_TO_YOURSELF";
    billingState: "FREE" | "PAID";
    selfGenderOverride?: Gender | null;
  }
) {
  const confession = await prisma.confession.create({
    data: {
      senderId,
      targetId,
      targetPhone,
      message,
      location,
      matchDetails: matchDetails as Prisma.InputJsonValue,
      status,
      expiresAt,
      isSelfConfession: options.isSelfConfession,
      billingCategory: options.billingCategory,
      billingState: options.billingState,
      selfGenderOverride: options.selfGenderOverride ?? null,
    },
  });

  // Check if target has already confessed this sender (mutual)
  if (options.isSelfConfession || senderId === targetId) {
    return confession;
  }

  const reverse = await prisma.confession.findFirst({
    where: { senderId: targetId, targetId: senderId, isSelfConfession: false },
  });

  if (reverse) {
    await prisma.confession.updateMany({
      where: { id: { in: [confession.id, reverse.id] } },
      data: { mutualDetected: true },
    });
  }

  return confession;
}
