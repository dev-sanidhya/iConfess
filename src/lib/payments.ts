import { PaymentStatus, PaymentType, Prisma, type Payment } from "@prisma/client";
import { normalizeSocialHandle } from "@/lib/auth";
import {
  buildSelfClaimSnapshot,
  confessionMatchesSelfClaim,
  convertConfessionToSelf,
  getLatestPaymentStatusByConfessionIds,
  isConfessionRecipientActive,
} from "@/lib/confessions";
import { type LocationCategory } from "@/lib/matching";
import { prisma } from "@/lib/prisma";
import { applyIdentityRevealPayment } from "@/lib/reveal-identity";
import {
  claimCompatiblePendingDetailSearchCounts,
  findOrCreateDirectShadowProfile,
  getPendingKindForLocation,
} from "@/lib/shadow-profiles";

type Tx = Prisma.TransactionClient;

type PaymentMetadata = Prisma.InputJsonValue | undefined;

type ManualPaymentMetadata = {
  confessionId?: string;
  targetUserId?: string;
  bundledPageUnlock?: boolean;
  bundledCardUnlock?: boolean;
  deliverOnSuccess?: boolean;
  flow?: string;
  source?: string;
};

function asRecord(value: Prisma.JsonValue | null | undefined) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, Prisma.JsonValue>;
}

function getStringField(record: Record<string, Prisma.JsonValue> | null, key: string) {
  const value = record?.[key];
  return typeof value === "string" ? value : null;
}

function getBooleanField(record: Record<string, Prisma.JsonValue> | null, key: string) {
  const value = record?.[key];
  return typeof value === "boolean" ? value : false;
}

export function normalizeTransactionReference(reference: string) {
  return reference.trim().replace(/\s+/g, "").toUpperCase();
}

export async function recordPayment(params: {
  userId: string;
  type: PaymentType;
  amount: number;
  status?: PaymentStatus;
  gateway?: string | null;
  gatewayTransactionId?: string | null;
  metadata?: PaymentMetadata;
}) {
  return prisma.payment.create({
    data: {
      userId: params.userId,
      type: params.type,
      amount: params.amount,
      status: params.status ?? PaymentStatus.SUCCESS,
      gateway: params.gateway ?? null,
      gatewayTransactionId: params.gatewayTransactionId ?? null,
      metadata: params.metadata,
    },
  });
}

export async function createManualPaymentRequest(params: {
  userId: string;
  type: PaymentType;
  amount: number;
  transactionReference: string;
  metadata?: ManualPaymentMetadata;
}) {
  const gatewayTransactionId = normalizeTransactionReference(params.transactionReference);

  if (!gatewayTransactionId || gatewayTransactionId.length < 8) {
    throw new Error("Enter a valid UTR / reference number");
  }

  const duplicate = await prisma.payment.findFirst({
    where: {
      gatewayTransactionId,
      status: { in: [PaymentStatus.PENDING, PaymentStatus.SUCCESS, PaymentStatus.REFUNDED] },
    },
    select: { id: true },
  });

  if (duplicate) {
    throw new Error("This UTR / reference number has already been used");
  }

  try {
    return await prisma.payment.create({
      data: {
        userId: params.userId,
        type: params.type,
        amount: params.amount,
        status: PaymentStatus.PENDING,
        gateway: "manual_upi",
        gatewayTransactionId,
        metadata: (params.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new Error("This UTR / reference number has already been used");
    }

    throw error;
  }
}

export async function findExistingPendingManualPayment(params: {
  userId: string;
  type: PaymentType;
  confessionId?: string;
  targetUserId?: string;
  targetShadowProfileId?: string;
}) {
  const payments = await prisma.payment.findMany({
    where: {
      userId: params.userId,
      type: params.type,
      status: PaymentStatus.PENDING,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    payments.find((payment) => {
      const metadata = asRecord(payment.metadata);
      if (params.confessionId) {
        return getStringField(metadata, "confessionId") === params.confessionId;
      }
      if (params.targetUserId) {
        return getStringField(metadata, "targetUserId") === params.targetUserId;
      }
      if (params.targetShadowProfileId) {
        return getStringField(metadata, "targetShadowProfileId") === params.targetShadowProfileId;
      }
      return true;
    }) ?? null
  );
}

async function applyUnlockConfessionPage(payment: Payment) {
  const user = await prisma.user.findUnique({
    where: { id: payment.userId },
    select: { confessionPageUnlocked: true },
  });

  if (!user || user.confessionPageUnlocked) {
    return;
  }

  await prisma.user.update({
    where: { id: payment.userId },
    data: { confessionPageUnlocked: true },
  });
}

async function applyUnlockConfessionCard(payment: Payment) {
  const metadata = asRecord(payment.metadata);
  const confessionId = getStringField(metadata, "confessionId");

  if (!confessionId) {
    throw new Error("Missing confession id for card unlock payment");
  }

  const confession = await prisma.confession.findUnique({
    where: { id: confessionId },
    select: { id: true, targetId: true },
  });

  if (!confession || confession.targetId !== payment.userId) {
    throw new Error("Confession not found for this payment");
  }

  await prisma.$transaction(async (tx) => {
    const existing = await tx.unlockedCard.findUnique({
      where: { userId_confessionId: { userId: payment.userId, confessionId } },
    });

    if (!existing) {
      await tx.unlockedCard.create({ data: { userId: payment.userId, confessionId } });
    }

    const shouldUnlockPage = getBooleanField(metadata, "bundledPageUnlock");
    if (shouldUnlockPage) {
      await tx.user.update({
        where: { id: payment.userId },
        data: { confessionPageUnlocked: true },
      });
    }

    await tx.confession.update({
      where: { id: confessionId },
      data: { status: "OPENED" },
    });
  });
}

async function applyUnlockProfileInsights(payment: Payment) {
  const metadata = asRecord(payment.metadata);
  const targetUserId = getStringField(metadata, "targetUserId");
  const targetShadowProfileId = getStringField(metadata, "targetShadowProfileId");

  if (!targetUserId && !targetShadowProfileId) {
    throw new Error("Missing target for profile insights payment");
  }

  if (targetShadowProfileId) {
    const shadow = await prisma.shadowProfile.findUnique({
      where: { id: targetShadowProfileId },
      select: { id: true, claimedByUserId: true },
    });

    if (!shadow || shadow.claimedByUserId) {
      throw new Error("Shadow profile not found for this payment");
    }

    const confessions = await prisma.confession.findMany({
      where: {
        shadowProfileId: targetShadowProfileId,
        targetId: null,
        status: "PENDING",
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        billingState: true,
        targetId: true,
        isSelfConfession: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (confessions.length === 0) {
      throw new Error("No insights are available for this profile");
    }

    const sendPaymentStatuses = await getLatestPaymentStatusByConfessionIds(
      confessions.map((confession) => confession.id),
      "SEND_CONFESSION",
      prisma
    );

    const hasActiveInsights = confessions.some((confession) =>
      isConfessionRecipientActive(confession, sendPaymentStatuses.get(confession.id))
    );

    if (!hasActiveInsights) {
      throw new Error("No insights are available for this profile");
    }

    // Shadow insight unlocks are tracked from successful payments metadata.
    return;
  }

  if (!targetUserId) {
    throw new Error("Missing target user id for profile insights payment");
  }

  const [existing, latestConfession] = await Promise.all([
    prisma.unlockedProfileInsight.findFirst({
      where: {
        viewerId: payment.userId,
        targetUserId,
      },
      orderBy: { unlockedAt: "desc" },
    }),
    prisma.confession.findFirst({
      where: {
        targetId: targetUserId,
      },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);

  if (!latestConfession) {
    throw new Error("No insights are available for this profile");
  }

  if (existing && latestConfession.createdAt <= existing.unlockedAt) {
    return;
  }

  await prisma.unlockedProfileInsight.create({
    data: {
      viewerId: payment.userId,
      targetUserId,
    },
  });
}

async function applySelfConfession(payment: Payment) {
  const metadata = asRecord(payment.metadata);
  const confessionId = getStringField(metadata, "confessionId");

  if (!confessionId) {
    throw new Error("Missing confession id for self-confession payment");
  }

  const confession = await prisma.confession.findUnique({
    where: { id: confessionId },
    select: {
      id: true,
      senderId: true,
      status: true,
      isSelfConfession: true,
      billingState: true,
    },
  });

  if (!confession || confession.senderId !== payment.userId) {
    throw new Error("Confession not found for this payment");
  }

  if (confession.isSelfConfession) {
    return;
  }

  if (confession.status !== "PENDING" || confession.billingState !== "FREE") {
    throw new Error("This card can no longer be converted to a self-confession");
  }

  await prisma.$transaction(async (tx) => {
    await convertConfessionToSelf(confession.id, payment.userId, tx);
  });
}

async function markMutualIfNeeded(confessionId: string, senderId: string, targetId: string, db: Tx) {
  if (!targetId || targetId === senderId) {
    return;
  }

  const reverse = await db.confession.findFirst({
    where: {
      senderId: targetId,
      targetId: senderId,
      isSelfConfession: false,
      status: "DELIVERED",
    },
    select: { id: true },
  });

  if (!reverse) {
    return;
  }

  await db.confession.updateMany({
    where: { id: { in: [confessionId, reverse.id] } },
    data: { mutualDetected: true },
  });
}

async function resolvePendingRecipientAfterSendPayment(confessionId: string, userId: string, db: Tx) {
  const confession = await db.confession.findUnique({
    where: { id: confessionId },
    select: {
      id: true,
      senderId: true,
      targetId: true,
      targetPhone: true,
      shadowProfileId: true,
      isSelfConfession: true,
      status: true,
      billingState: true,
      location: true,
      matchDetails: true,
    },
  });

  if (!confession || confession.senderId !== userId) {
    throw new Error("Confession not found for this payment");
  }

  if (confession.targetId || confession.isSelfConfession) {
    if (confession.targetId) {
      await db.confession.update({
        where: { id: confession.id },
        data: { status: "DELIVERED" },
      });
      await markMutualIfNeeded(confession.id, confession.senderId, confession.targetId, db);
    }
    return;
  }

  const matchDetails = (confession.matchDetails as Record<string, unknown>) ?? {};

  if (confession.targetPhone) {
    const target = await db.user.findUnique({
      where: { phone: confession.targetPhone },
      select: { id: true },
    });

    if (target) {
      await db.confession.update({
        where: { id: confession.id },
        data: {
          targetId: target.id,
          status: "DELIVERED",
        },
      });
      await markMutualIfNeeded(confession.id, confession.senderId, target.id, db);
      return;
    }

    const shadow = await findOrCreateDirectShadowProfile({
      kind: "PHONE",
      value: confession.targetPhone,
      matchDetails,
      db,
    });

    await db.confession.update({
      where: { id: confession.id },
      data: {
        shadowProfileId: shadow.id,
        status: "PENDING",
      },
    });
    return;
  }

  const platform = typeof matchDetails.platform === "string" ? matchDetails.platform : "";
  const handle = normalizeSocialHandle(typeof matchDetails.handle === "string" ? matchDetails.handle : "");

  if (handle && (platform === "instagram" || platform === "snapchat")) {
    const target = await db.user.findFirst({
      where: platform === "instagram"
        ? { instagramHandle: handle }
        : { snapchatHandle: handle },
      select: {
        id: true,
        name: true,
        phone: true,
        instagramHandle: true,
        snapchatHandle: true,
        gender: true,
        college: true,
        school: true,
        workplace: true,
        gym: true,
        neighbourhood: true,
      },
    });

    if (target) {
      const selfClaimSnapshot = buildSelfClaimSnapshot(target);
      if (target.id === confession.senderId && confessionMatchesSelfClaim(confession, selfClaimSnapshot)) {
        if (confession.billingState === "FREE") {
          await db.confession.update({
            where: { id: confession.id },
            data: { status: "PENDING" },
          });
          return;
        }

        await convertConfessionToSelf(confession.id, target.id, db);
        return;
      }

      await db.confession.update({
        where: { id: confession.id },
        data: {
          targetId: target.id,
          status: "DELIVERED",
        },
      });
      await markMutualIfNeeded(confession.id, confession.senderId, target.id, db);
      return;
    }

    const shadow = await findOrCreateDirectShadowProfile({
      kind: platform === "instagram" ? "INSTAGRAM" : "SNAPCHAT",
      value: handle,
      matchDetails,
      db,
    });

    await db.confession.update({
      where: { id: confession.id },
      data: {
        shadowProfileId: shadow.id,
        status: "PENDING",
      },
    });
    return;
  }

  const selectedShadowProfileId =
    typeof matchDetails.selectedShadowProfileId === "string" ? matchDetails.selectedShadowProfileId : null;
  if (selectedShadowProfileId) {
    const existingShadow = await db.shadowProfile.findFirst({
      where: {
        id: selectedShadowProfileId,
        claimedByUserId: null,
      },
      select: { id: true },
    });

    if (existingShadow) {
      await db.confession.update({
        where: { id: confession.id },
        data: {
          shadowProfileId: existingShadow.id,
          status: "PENDING",
        },
      });
      return;
    }
  }

  const detailRecord = matchDetails as Record<string, string>;
  const carriedSearchCount = await claimCompatiblePendingDetailSearchCounts({
    category: confession.location as LocationCategory,
    details: detailRecord,
    fullName: typeof detailRecord.fullName === "string" ? detailRecord.fullName : "",
    db,
  });

  const shadow = await db.shadowProfile.create({
    data: {
      kind: getPendingKindForLocation(confession.location as LocationCategory),
      value: crypto.randomUUID(),
      location: confession.location as LocationCategory,
      displayName: typeof detailRecord.fullName === "string" ? detailRecord.fullName : "Unregistered user",
      profileDetails: confession.matchDetails as Prisma.InputJsonValue,
      searchCount: carriedSearchCount,
    },
  });

  await db.confession.update({
    where: { id: confession.id },
    data: {
      shadowProfileId: shadow.id,
      status: "PENDING",
    },
  });
}

async function applySendConfession(payment: Payment) {
  const metadata = asRecord(payment.metadata);
  const confessionId = getStringField(metadata, "confessionId");

  if (!confessionId) {
    throw new Error("Missing confession id for send payment");
  }

  const confession = await prisma.confession.findUnique({
    where: { id: confessionId },
    select: {
      id: true,
      senderId: true,
      targetId: true,
      isSelfConfession: true,
      status: true,
    },
  });

  if (!confession || confession.senderId !== payment.userId) {
    throw new Error("Confession not found for this payment");
  }

  const deliverOnSuccess = getBooleanField(metadata, "deliverOnSuccess");

  await prisma.$transaction(async (tx) => {
    if (deliverOnSuccess) {
      await tx.confession.update({
        where: { id: confession.id },
        data: { status: "DELIVERED" },
      });

      if (!confession.isSelfConfession && confession.targetId && confession.targetId !== payment.userId) {
        await markMutualIfNeeded(confession.id, payment.userId, confession.targetId, tx);
      }
      return;
    }

    await resolvePendingRecipientAfterSendPayment(confession.id, payment.userId, tx);
  });
}

export async function applySuccessfulPayment(paymentId: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
  });

  if (!payment || payment.status !== PaymentStatus.SUCCESS) {
    return;
  }

  if (payment.type === PaymentType.UNLOCK_CONFESSION_PAGE) {
    await applyUnlockConfessionPage(payment);
    return;
  }

  if (payment.type === PaymentType.UNLOCK_CONFESSION_CARD) {
    await applyUnlockConfessionCard(payment);
    return;
  }

  if (payment.type === PaymentType.UNLOCK_PROFILE_INSIGHTS) {
    await applyUnlockProfileInsights(payment);
    return;
  }

  if (payment.type === PaymentType.SELF_CONFESSION) {
    await applySelfConfession(payment);
    return;
  }

  if (payment.type === PaymentType.SEND_CONFESSION) {
    await applySendConfession(payment);
    return;
  }

  if (payment.type === PaymentType.IDENTITY_REVEAL) {
    const metadata = asRecord(payment.metadata);
    const confessionId = getStringField(metadata, "confessionId");

    if (!confessionId) {
      throw new Error("Missing confession id for identity reveal payment");
    }

    await applyIdentityRevealPayment(confessionId, payment.userId, payment.metadata);
  }
}
