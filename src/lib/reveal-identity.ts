import { PaymentStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { PaymentCatalog, PaymentPricingKey, PricingShape } from "@/lib/pricing";

function asRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

export function isMissingIdentityRevealPaymentType(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.message.includes('invalid input value for enum "PaymentType": "IDENTITY_REVEAL"');
}

let identityRevealPaymentTypeSupport: boolean | null = null;

export async function dbSupportsIdentityRevealPaymentType() {
  if (identityRevealPaymentTypeSupport !== null) {
    return identityRevealPaymentTypeSupport;
  }

  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>(Prisma.sql`
    SELECT EXISTS (
      SELECT 1
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'PaymentType'
        AND e.enumlabel = 'IDENTITY_REVEAL'
    ) AS "exists"
  `);

  identityRevealPaymentTypeSupport = rows[0]?.exists === true;
  return identityRevealPaymentTypeSupport;
}

export function getIdentityRevealPricingKey(pageUnlocked: boolean, cardUnlocked: boolean): PaymentPricingKey {
  if (pageUnlocked && cardUnlocked) return "identityRevealOnly";
  if (pageUnlocked && !cardUnlocked) return "identityRevealWithCard";
  if (!pageUnlocked && cardUnlocked) return "identityRevealWithPage";
  return "identityRevealWithCardAndPage";
}

export function getIdentityRevealPaymentConfig(
  pageUnlocked: boolean,
  cardUnlocked: boolean,
  catalog: Pick<PaymentCatalog, "pricing" | "qrCodes"> | { pricing: PricingShape; qrCodes: PaymentCatalog["qrCodes"] }
) {
  const pricingKey = getIdentityRevealPricingKey(pageUnlocked, cardUnlocked);

  return {
    pricingKey,
    amount: catalog.pricing[pricingKey],
    qrCodeDataUrl: catalog.qrCodes[pricingKey],
  };
}

export async function userHasApprovedRevealPayment(userId: string, confessionId: string) {
  const isSupported = await dbSupportsIdentityRevealPaymentType();
  if (!isSupported) {
    return false;
  }

  let payment = null;
  try {
    payment = await prisma.payment.findFirst({
      where: {
        userId,
        type: "IDENTITY_REVEAL",
        status: PaymentStatus.SUCCESS,
      },
      orderBy: { createdAt: "desc" },
      select: { metadata: true },
    });
  } catch (error) {
    if (isMissingIdentityRevealPaymentType(error)) {
      return false;
    }

    throw error;
  }

  const metadata = asRecord(payment?.metadata);
  return metadata?.confessionId === confessionId;
}

export async function applyIdentityRevealPayment(confessionId: string, userId: string, metadata: unknown) {
  const metadataRecord = asRecord(metadata);
  const bundledPageUnlock = metadataRecord?.bundledPageUnlock === true;
  const bundledCardUnlock = metadataRecord?.bundledCardUnlock === true;

  const confession = await prisma.confession.findUnique({
    where: { id: confessionId },
    select: {
      id: true,
      senderId: true,
      targetId: true,
      mutualDetected: true,
      revealedAt: true,
    },
  });

  if (!confession || confession.targetId !== userId) {
    throw new Error("Confession not found for this reveal payment");
  }

  if (!confession.mutualDetected) {
    throw new Error("Reveal payment is only valid for mutual confessions");
  }

  if (confession.revealedAt) {
    return;
  }

  const reverse = await prisma.confession.findFirst({
    where: {
      senderId: confession.targetId ?? undefined,
      targetId: confession.senderId,
    },
    select: { id: true },
  });

  await prisma.$transaction(async (tx) => {
    if (bundledPageUnlock) {
      await tx.user.update({
        where: { id: userId },
        data: { confessionPageUnlocked: true },
      });
    }

    if (bundledCardUnlock) {
      const existing = await tx.unlockedCard.findUnique({
        where: { userId_confessionId: { userId, confessionId } },
      });

      if (!existing) {
        await tx.unlockedCard.create({
          data: { userId, confessionId },
        });
      }

      await tx.confession.update({
        where: { id: confessionId },
        data: { status: "OPENED" },
      });
    }

    await tx.confession.update({
      where: { id: confessionId },
      data: { targetRevealConsent: true },
    });

    if (reverse) {
      await tx.confession.update({
        where: { id: reverse.id },
        data: { senderRevealConsent: true },
      });
    }
  });

  const refreshed = await prisma.confession.findUnique({
    where: { id: confessionId },
    select: {
      senderRevealConsent: true,
      targetRevealConsent: true,
    },
  });

  if (refreshed?.senderRevealConsent && refreshed.targetRevealConsent) {
    const revealTime = new Date();
    const ids = [confessionId, reverse?.id].filter(Boolean) as string[];
    await prisma.confession.updateMany({
      where: { id: { in: ids } },
      data: { revealedAt: revealTime },
    });
  }
}
