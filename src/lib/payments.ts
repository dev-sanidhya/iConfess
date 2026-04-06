import { PaymentStatus, PaymentType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type PaymentMetadata = Prisma.InputJsonValue | undefined;

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
