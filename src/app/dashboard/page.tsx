import { getSession } from "@/lib/auth";
import { ensureProfileSearchCountSeeded } from "@/lib/profile-search-count";
import { prisma } from "@/lib/prisma";
import DashboardOverview from "@/components/DashboardOverview";

export default async function DashboardPage() {
  const user = await getSession();
  if (!user) return null;

  const [
    profileSearchCount,
    receivedConfessionCount,
    lockedReceivedConfessionCount,
    profileInsightUnlockCount,
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
  ]);

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
    />
  );
}
