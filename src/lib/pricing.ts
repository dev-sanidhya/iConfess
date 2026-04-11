import type { PaymentServiceKey } from "@prisma/client";

export const paymentServiceDefinitions = [
  {
    service: "SEND_CONFESSION",
    pricingKey: "sendConfession",
    label: "Send confession",
    description: "Charged per confession card sent.",
  },
  {
    service: "SELF_CONFESSION",
    pricingKey: "selfConfession",
    label: "Confession to yourself",
    description: "Used when a pending card is converted into a confession to yourself after review.",
  },
  {
    service: "UNLOCK_CONFESSION_CARD",
    pricingKey: "unlockReceivedConfessionCard",
    label: "Unlock received confession card",
    description: "Charged per received confession card.",
  },
  {
    service: "UNLOCK_CONFESSION_CARD_WITH_PAGE",
    pricingKey: "unlockReceivedConfessionCardWithPage",
    label: "Unlock card + My Confessions page",
    description: "Used when the user unlocks a received card while their My Confessions page is still locked.",
  },
  {
    service: "UNLOCK_CONFESSION_PAGE",
    pricingKey: "unlockReceivedConfessionPage",
    label: "Unlock received confessions page",
    description: "Unlocks the inbox page for a limited period.",
  },
  {
    service: "UNLOCK_PROFILE_INSIGHTS",
    pricingKey: "viewInsights",
    label: "Unlock profile insights",
    description: "Covers currently available insight items for a profile.",
  },
  {
    service: "IDENTITY_REVEAL",
    pricingKey: "identityRevealOnly",
    label: "Identity reveal only",
    description: "Used when mutual identity reveal is paid after both the card and My Confessions page are already unlocked.",
  },
  {
    service: "IDENTITY_REVEAL_WITH_CARD",
    pricingKey: "identityRevealWithCard",
    label: "Identity reveal + card unlock",
    description: "Used when mutual identity reveal also needs this confession card to be unlocked first.",
  },
  {
    service: "IDENTITY_REVEAL_WITH_PAGE",
    pricingKey: "identityRevealWithPage",
    label: "Identity reveal + page unlock",
    description: "Used when mutual identity reveal also needs the My Confessions page to be unlocked first.",
  },
  {
    service: "IDENTITY_REVEAL_WITH_CARD_AND_PAGE",
    pricingKey: "identityRevealWithCardAndPage",
    label: "Identity reveal + card + page unlock",
    description: "Used when mutual identity reveal needs both the confession card and My Confessions page unlocked first.",
  },
] as const satisfies ReadonlyArray<{
  service: PaymentServiceKey;
  pricingKey: string;
  label: string;
  description: string;
}>;

export type PaymentPricingKey = (typeof paymentServiceDefinitions)[number]["pricingKey"];

export type PricingShape = {
  sendConfession: number;
  selfConfession: number;
  unlockReceivedConfessionCard: number;
  unlockReceivedConfessionCardWithPage: number;
  viewInsights: number;
  unlockReceivedConfessionPage: number;
  identityRevealOnly: number;
  identityRevealWithCard: number;
  identityRevealWithPage: number;
  identityRevealWithCardAndPage: number;
  unlockReceivedConfessionPageMonths: number;
};

export type PaymentQrCodes = Record<Exclude<PaymentPricingKey, never>, string | null>;

export type PaymentCatalog = {
  pricing: PricingShape;
  qrCodes: PaymentQrCodes;
  services: Array<{
    service: PaymentServiceKey;
    pricingKey: PaymentPricingKey;
    label: string;
    description: string;
    amount: number;
    qrCodeDataUrl: string | null;
  }>;
};

export const pricing: PricingShape = {
  sendConfession: 999,
  selfConfession: 999,
  unlockReceivedConfessionCard: 999,
  unlockReceivedConfessionCardWithPage: 1299,
  viewInsights: 499,
  unlockReceivedConfessionPage: 299,
  identityRevealOnly: 1499,
  identityRevealWithCard: 2498,
  identityRevealWithPage: 1798,
  identityRevealWithCardAndPage: 2797,
  unlockReceivedConfessionPageMonths: 6,
};

export const defaultQrCodes: PaymentQrCodes = {
  sendConfession: null,
  selfConfession: null,
  unlockReceivedConfessionCard: null,
  unlockReceivedConfessionCardWithPage: null,
  viewInsights: null,
  unlockReceivedConfessionPage: null,
  identityRevealOnly: null,
  identityRevealWithCard: null,
  identityRevealWithPage: null,
  identityRevealWithCardAndPage: null,
};

export function getDefaultPaymentCatalog(): PaymentCatalog {
  return {
    pricing: { ...pricing },
    qrCodes: { ...defaultQrCodes },
    services: paymentServiceDefinitions.map((definition) => ({
      ...definition,
      amount: pricing[definition.pricingKey],
      qrCodeDataUrl: defaultQrCodes[definition.pricingKey],
    })),
  };
}

export function getPaymentDefinitionByService(service: PaymentServiceKey) {
  return paymentServiceDefinitions.find((definition) => definition.service === service) ?? null;
}

export function getPaymentDefinitionByPricingKey(pricingKey: PaymentPricingKey) {
  return paymentServiceDefinitions.find((definition) => definition.pricingKey === pricingKey) ?? null;
}

export function formatInr(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function getCombinedReceivedUnlockPrice(cardCount: number, currentPricing: PricingShape = pricing) {
  return currentPricing.unlockReceivedConfessionPage + currentPricing.unlockReceivedConfessionCard * cardCount;
}
