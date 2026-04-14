import "server-only";

import { Prisma } from "@prisma/client";
import type { PaymentServiceKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  defaultQrCodes,
  getDefaultPaymentCatalog,
  getPaymentDefinitionByPricingKey,
  getPaymentDefinitionByService,
  type PaymentCatalog,
  type PaymentPricingKey,
} from "@/lib/pricing";

function isMissingPaymentConfigTable(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021";
}

function isUnavailableDatasource(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P6001";
}

export async function getPaymentCatalog(): Promise<PaymentCatalog> {
  const catalog = getDefaultPaymentCatalog();
  let configs: Awaited<ReturnType<typeof prisma.paymentServiceConfig.findMany>>;
  try {
    configs = await prisma.paymentServiceConfig.findMany();
  } catch (error) {
    if (isMissingPaymentConfigTable(error) || isUnavailableDatasource(error)) {
      return catalog;
    }

    throw error;
  }

  for (const config of configs) {
    const definition = getPaymentDefinitionByService(config.service);
    if (!definition) {
      continue;
    }

    catalog.pricing[definition.pricingKey] = config.amount;
    catalog.qrCodes[definition.pricingKey] = config.qrCodeDataUrl ?? null;
  }

  catalog.services = catalog.services.map((service) => ({
    ...service,
    amount: catalog.pricing[service.pricingKey],
    qrCodeDataUrl: catalog.qrCodes[service.pricingKey],
  }));

  return catalog;
}

export async function getPaymentAmount(pricingKey: PaymentPricingKey) {
  const definition = getPaymentDefinitionByPricingKey(pricingKey);
  if (!definition) {
    throw new Error(`Unknown pricing key: ${pricingKey}`);
  }

  try {
    const config = await prisma.paymentServiceConfig.findUnique({
      where: { service: definition.service },
      select: { amount: true },
    });

    return config?.amount ?? getDefaultPaymentCatalog().pricing[pricingKey];
  } catch (error) {
    if (isMissingPaymentConfigTable(error) || isUnavailableDatasource(error)) {
      return getDefaultPaymentCatalog().pricing[pricingKey];
    }

    throw error;
  }
}

export async function upsertPaymentServiceConfig(params: {
  service: PaymentServiceKey;
  amount: number;
  qrCodeDataUrl?: string | null;
}) {
  const definition = getPaymentDefinitionByService(params.service);
  if (!definition) {
    throw new Error("Invalid payment service");
  }

  try {
    return await prisma.paymentServiceConfig.upsert({
      where: { service: params.service },
      update: {
        amount: params.amount,
        qrCodeDataUrl:
          params.qrCodeDataUrl === undefined
            ? undefined
            : params.qrCodeDataUrl || null,
      },
      create: {
        service: params.service,
        amount: params.amount,
        qrCodeDataUrl:
          params.qrCodeDataUrl === undefined
            ? defaultQrCodes[definition.pricingKey]
            : params.qrCodeDataUrl || null,
      },
    });
  } catch (error) {
    if (isMissingPaymentConfigTable(error) || isUnavailableDatasource(error)) {
      throw new Error("Payment settings table is missing. Run the latest Prisma migration first.");
    }

    throw error;
  }
}
