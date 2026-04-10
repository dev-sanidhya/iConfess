import { NextRequest, NextResponse } from "next/server";
import { Gender, Prisma } from "@prisma/client";
import { getSession, normalizeSocialHandle } from "@/lib/auth";
import { findMatches } from "@/lib/matching";
import { getPaymentAmount } from "@/lib/payment-catalog.server";
import { createManualPaymentRequest } from "@/lib/payments";
import { prisma } from "@/lib/prisma";
import { buildSharedProfileOptionsFromUser, getSharedProfileOptionByCategory } from "@/lib/shared-profile-context";
import { addDays } from "@/lib/utils";
import {
  countSentConfessionsToOthers,
  normalizeComparableFullName,
  normalizeComparableHandle,
} from "@/lib/confessions";

const DUPLICATE_CONFESSION_WINDOW_MS = 2 * 60 * 1000;

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { flow, location, matchDetails, message, targetPhone, firstName, lastName, platform, handle, targetUserId, sharedProfileCategory, selfGenderOverride, transactionReference } = body;

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
          const shouldCharge = !isFree;
          const confession = await createAndCheckMutual(
            user.id,
            user.id,
            null,
            "COLLEGE",
            confessionMatchDetails,
            message,
            expiresAt,
            shouldCharge ? "PENDING" : "DELIVERED",
            {
              isSelfConfession: true,
              billingCategory: "CONFESSION_TO_YOURSELF",
              billingState: "PAID",
              selfGenderOverride: validSelfGenderOverride,
              detectMutual: false,
            }
          );
          const paymentResponse = await queueSendPaymentIfNeeded({
            userId: user.id,
            isFree,
            confessionId: confession.id,
            flow: "phone",
            transactionReference,
            deliverOnSuccess: true,
          });
          if (paymentResponse) return paymentResponse;
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
          "COLLEGE", confessionMatchDetails, message, expiresAt, isFree ? "DELIVERED" : "PENDING",
          {
            isSelfConfession: false,
            billingCategory: "CONFESSION_TO_OTHERS",
            billingState: isFree ? "FREE" : "PAID",
            detectMutual: isFree,
          }
        );
        const paymentResponse = await queueSendPaymentIfNeeded({
          userId: user.id,
          isFree,
          confessionId: confession.id,
          flow: "phone",
          transactionReference,
          deliverOnSuccess: true,
        });
        if (paymentResponse) return paymentResponse;
        return NextResponse.json({
          success: true,
          matchFound: true,
          confessionId: confession.id,
          isFree,
          deliveryMode: "delivered",
        });
      }

      // Unregistered — queue via phone
      const existingPhoneDuplicate = await findRecentDuplicateConfession({
        senderId: user.id,
        targetId: null,
        targetPhone,
        location: "COLLEGE",
        message,
        matchDetails: confessionMatchDetails,
        isSelfConfession: false,
      });
      if (existingPhoneDuplicate) {
        const paymentResponse = await queueSendPaymentIfNeeded({
          userId: user.id,
          isFree,
          confessionId: existingPhoneDuplicate.id,
          flow: "phone",
          transactionReference,
          deliverOnSuccess: false,
        });
        if (paymentResponse) return paymentResponse;

        return NextResponse.json({
          success: true,
          matchFound: false,
          confessionId: existingPhoneDuplicate.id,
          isFree,
          deliveryMode: "phone_outreach",
        });
      }

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
      const paymentResponse = await queueSendPaymentIfNeeded({
        userId: user.id,
        isFree,
        confessionId: confession.id,
        flow: "phone",
        transactionReference,
        deliverOnSuccess: false,
      });
      if (paymentResponse) return paymentResponse;

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
        const socialMatchDetails = {
          ...confessionMatchDetails,
          platform,
          handle: normalizedHandle,
        };
        const existingSocialDuplicate = await findRecentDuplicateConfession({
          senderId: user.id,
          targetId: null,
          targetPhone: null,
          location: "COLLEGE",
          message,
          matchDetails: socialMatchDetails,
          isSelfConfession: false,
        });
        if (existingSocialDuplicate) {
          const paymentResponse = await queueSendPaymentIfNeeded({
            userId: user.id,
            isFree,
            confessionId: existingSocialDuplicate.id,
            flow: "social",
            transactionReference,
            deliverOnSuccess: false,
          });
          if (paymentResponse) return paymentResponse;

          return NextResponse.json({
            success: true,
            matchFound: false,
            confessionId: existingSocialDuplicate.id,
            isFree,
            deliveryMode: "pending_registration",
          });
        }

        const confession = await prisma.confession.create({
          data: {
            senderId: user.id,
            message,
            location: "COLLEGE",
            matchDetails: socialMatchDetails as Prisma.InputJsonValue,
            status: "PENDING",
            expiresAt,
            billingCategory: "CONFESSION_TO_OTHERS",
            billingState: isFree ? "FREE" : "PAID",
          },
        });
        const paymentResponse = await queueSendPaymentIfNeeded({
          userId: user.id,
          isFree,
          confessionId: confession.id,
          flow: "social",
          transactionReference,
          deliverOnSuccess: false,
        });
        if (paymentResponse) return paymentResponse;

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
        const shouldCharge = !isFree;
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
          shouldCharge ? "PENDING" : "DELIVERED",
          {
            isSelfConfession: true,
            billingCategory: "CONFESSION_TO_YOURSELF",
            billingState: "PAID",
            selfGenderOverride: validSelfGenderOverride,
            detectMutual: false,
          }
        );
        const paymentResponse = await queueSendPaymentIfNeeded({
          userId: user.id,
          isFree,
          confessionId: confession.id,
          flow: "social",
          transactionReference,
          deliverOnSuccess: true,
        });
        if (paymentResponse) return paymentResponse;

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
        isFree ? "DELIVERED" : "PENDING",
        {
          isSelfConfession: false,
          billingCategory: "CONFESSION_TO_OTHERS",
          billingState: isFree ? "FREE" : "PAID",
          detectMutual: isFree,
        }
      );
      const paymentResponse = await queueSendPaymentIfNeeded({
        userId: user.id,
        isFree,
        confessionId: confession.id,
        flow: "social",
        transactionReference,
        deliverOnSuccess: true,
      });
      if (paymentResponse) return paymentResponse;

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
        const shouldCharge = !isFree;
        const confession = await createAndCheckMutual(
          user.id,
          user.id,
          null,
          location as "COLLEGE" | "SCHOOL" | "WORKPLACE" | "GYM" | "NEIGHBOURHOOD",
          confessionMatchDetails,
          message,
          expiresAt,
          shouldCharge ? "PENDING" : "DELIVERED",
          {
            isSelfConfession: true,
            billingCategory: "CONFESSION_TO_YOURSELF",
            billingState: "PAID",
            selfGenderOverride: validSelfGenderOverride,
            detectMutual: false,
          }
        );
        const paymentResponse = await queueSendPaymentIfNeeded({
          userId: user.id,
          isFree,
          confessionId: confession.id,
          flow: "profile",
          transactionReference,
          deliverOnSuccess: true,
        });
        if (paymentResponse) return paymentResponse;

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
        isFree ? "DELIVERED" : "PENDING",
        {
          isSelfConfession: false,
          billingCategory: "CONFESSION_TO_OTHERS",
          billingState: isFree ? "FREE" : "PAID",
          detectMutual: isFree,
        }
      );
      const paymentResponse = await queueSendPaymentIfNeeded({
        userId: user.id,
        isFree,
        confessionId: confession.id,
        flow: "profile",
        transactionReference,
        deliverOnSuccess: true,
      });
      if (paymentResponse) return paymentResponse;

      return NextResponse.json({
        success: true,
        matchFound: true,
        confessionId: confession.id,
        isFree,
        deliveryMode: "delivered",
      });
    }

    const existingProfileDuplicate = await findRecentDuplicateConfession({
      senderId: user.id,
      targetId: null,
      targetPhone: null,
      location,
      message,
      matchDetails: confessionMatchDetails,
      isSelfConfession: false,
    });
    if (existingProfileDuplicate) {
      const paymentResponse = await queueSendPaymentIfNeeded({
        userId: user.id,
        isFree,
        confessionId: existingProfileDuplicate.id,
        flow: "profile",
        transactionReference,
        deliverOnSuccess: false,
      });
      if (paymentResponse) return paymentResponse;

      return NextResponse.json({
        success: true,
        matchFound: false,
        confessionId: existingProfileDuplicate.id,
        isFree,
        deliveryMode: "pending_registration",
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
    const paymentResponse = await queueSendPaymentIfNeeded({
      userId: user.id,
      isFree,
      confessionId: confession.id,
      flow: "profile",
      transactionReference,
      deliverOnSuccess: false,
    });
    if (paymentResponse) return paymentResponse;

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

async function findRecentDuplicateConfession(params: {
  senderId: string;
  targetId: string | null;
  targetPhone: string | null;
  location: "COLLEGE" | "SCHOOL" | "WORKPLACE" | "GYM" | "NEIGHBOURHOOD";
  message: string;
  matchDetails: Record<string, unknown>;
  isSelfConfession: boolean;
}) {
  const recentConfessions = await prisma.confession.findMany({
    where: {
      senderId: params.senderId,
      targetId: params.targetId,
      targetPhone: params.targetPhone,
      location: params.location,
      message: params.message,
      isSelfConfession: params.isSelfConfession,
      createdAt: {
        gte: new Date(Date.now() - DUPLICATE_CONFESSION_WINDOW_MS),
      },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      matchDetails: true,
    },
  });

  const targetMatchDetails = JSON.stringify(normalizeJsonValue(params.matchDetails));
  return (
    recentConfessions.find((confession) => {
      return JSON.stringify(normalizeJsonValue(confession.matchDetails)) === targetMatchDetails;
    }) ?? null
  );
}

function normalizeJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeJsonValue(entry));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entryValue]) => [key, normalizeJsonValue(entryValue)])
    );
  }

  if (typeof value === "string") {
    return value.trim();
  }

  return value;
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
async function queueSendPaymentIfNeeded(params: {
  userId: string;
  isFree: boolean;
  confessionId: string;
  flow: "phone" | "social" | "profile";
  transactionReference?: string;
  deliverOnSuccess: boolean;
}) {
  if (params.isFree) {
    return null;
  }

  const sendConfessionAmount = await getPaymentAmount("sendConfession");

  if (!params.transactionReference || typeof params.transactionReference !== "string") {
    return NextResponse.json(
      {
        requiresPayment: true,
        amount: sendConfessionAmount,
      },
      { status: 402 }
    );
  }

  await createManualPaymentRequest({
    userId: params.userId,
    type: "SEND_CONFESSION",
    amount: sendConfessionAmount,
    transactionReference: params.transactionReference,
    metadata: {
      confessionId: params.confessionId,
      flow: params.flow,
      deliverOnSuccess: params.deliverOnSuccess,
      source: "send-confession",
    },
  });

  return NextResponse.json({
    success: true,
    pendingReview: true,
    confessionId: params.confessionId,
    deliveryMode: params.deliverOnSuccess ? "delivered" : "pending_registration",
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
    detectMutual?: boolean;
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
  if (options.isSelfConfession || senderId === targetId || options.detectMutual === false) {
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
