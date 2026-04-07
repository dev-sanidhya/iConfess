import { PaymentStatus, PaymentType, Prisma, type Payment } from "@prisma/client";
import { convertConfessionToSelf } from "@/lib/confessions";
import { prisma } from "@/lib/prisma";

type PaymentMetadata = Prisma.InputJsonValue | undefined;

type ManualPaymentMetadata = {
  confessionId?: string;
  targetUserId?: string;
  bundledPageUnlock?: boolean;
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

export function getManualPaymentConfig() {
  return {
    upiId: process.env.NEXT_PUBLIC_UPI_ID ?? process.env.MANUAL_PAYMENT_UPI_ID ?? "",
    payeeName: process.env.NEXT_PUBLIC_UPI_PAYEE ?? process.env.MANUAL_PAYMENT_UPI_PAYEE ?? "iConfess",
  };
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

  return prisma.payment.create({
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
}

export async function findExistingPendingManualPayment(params: {
  userId: string;
  type: PaymentType;
  confessionId?: string;
  targetUserId?: string;
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

  if (!targetUserId) {
    throw new Error("Missing target user id for profile insights payment");
  }

  const existing = await prisma.unlockedProfileInsight.findFirst({
    where: {
      viewerId: payment.userId,
      targetUserId,
    },
    orderBy: { unlockedAt: "desc" },
  });

  if (existing) {
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

  if (!deliverOnSuccess) {
    return;
  }

  await prisma.confession.update({
    where: { id: confession.id },
    data: { status: "DELIVERED" },
  });

  if (confession.isSelfConfession || !confession.targetId || confession.targetId === payment.userId) {
    return;
  }

  const reverse = await prisma.confession.findFirst({
    where: {
      senderId: confession.targetId,
      targetId: payment.userId,
      isSelfConfession: false,
      status: "DELIVERED",
    },
    select: { id: true },
  });

  if (!reverse) {
    return;
  }

  await prisma.confession.updateMany({
    where: { id: { in: [confession.id, reverse.id] } },
    data: { mutualDetected: true },
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
  }
}
