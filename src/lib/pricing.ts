export const pricing = {
  sendConfession: 999,
  selfConfession: 999,
  unlockReceivedConfessionCard: 999,
  viewInsights: 499,
  unlockReceivedConfessionPage: 299,
  unlockReceivedConfessionPageMonths: 6,
} as const;

export function formatInr(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function getCombinedReceivedUnlockPrice(cardCount: number) {
  return pricing.unlockReceivedConfessionPage + pricing.unlockReceivedConfessionCard * cardCount;
}
