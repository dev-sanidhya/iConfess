import { getSession } from "@/lib/auth";
import { getAppSettings } from "@/lib/app-settings";
import { ensureProfileSearchCountSeeded } from "@/lib/profile-search-count";
import { prisma } from "@/lib/prisma";
import DashboardOverview from "@/components/DashboardOverview";
import { PaymentStatus } from "@prisma/client";

export default async function DashboardPage() {
  const user = await getSession();
  if (!user) return null;
  const appSettings = await getAppSettings();

  const [
    profileSearchCount,
    receivedConfessionCount,
    lockedReceivedConfessionCount,
    directProfileInsightUnlockCount,
    claimedShadowIds,
    shadowInsightPayments,
  ] = await Promise.all([
    ensureProfileSearchCountSeeded(user.id, prisma),
    prisma.confession.count({ where: { targetId: user.id } }),
    prisma.confession.count({
      where: {
        targetId: user.id,
        unlockedBy: {
          none: { userId: user.id },
        },
      },
    }),
    prisma.unlockedProfileInsight.count({ where: { targetUserId: user.id } }),
    prisma.shadowProfile.findMany({
      where: { claimedByUserId: user.id },
      select: { id: true },
    }),
    prisma.payment.findMany({
      where: {
        type: "UNLOCK_PROFILE_INSIGHTS",
        status: PaymentStatus.SUCCESS,
      },
      select: {
        metadata: true,
      },
    }),
  ]);

  const claimedShadowIdSet = new Set(claimedShadowIds.map((shadow) => shadow.id));
  const shadowProfileInsightUnlockCount = shadowInsightPayments.filter((payment) => {
    if (!payment.metadata || typeof payment.metadata !== "object" || Array.isArray(payment.metadata)) {
      return false;
    }

    const targetShadowProfileId = (payment.metadata as Record<string, unknown>).targetShadowProfileId;
    return typeof targetShadowProfileId === "string" && claimedShadowIdSet.has(targetShadowProfileId);
  }).length;
  const profileInsightUnlockCount = directProfileInsightUnlockCount + shadowProfileInsightUnlockCount;

  return (
    <DashboardOverview
      user={{
        name: user.name,
        id: user.id,
        phone: user.phone,
        primaryCategory: user.primaryCategory,
        searchablePlaces: [user.college, user.school, user.workplace, user.gym, user.neighbourhood].filter(Boolean).length,
      }}
      stats={{ profileSearchCount, receivedConfessionCount, lockedReceivedConfessionCount, profileInsightUnlockCount }}
      confessionPageUnlocked={user.confessionPageUnlocked}
      feedbackEmail={appSettings.feedbackEmail}
    />
  );
}
