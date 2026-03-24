import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DashboardOverview from "@/components/DashboardOverview";

export default async function DashboardPage() {
  const user = await getSession();
  if (!user) return null;

  const [sentCount, receivedCount, mutualCount, pendingCount] = await Promise.all([
    prisma.confession.count({ where: { senderId: user.id } }),
    prisma.confession.count({ where: { targetId: user.id } }),
    prisma.confession.count({ where: { OR: [{ senderId: user.id }, { targetId: user.id }], mutualDetected: true } }),
    prisma.confession.count({ where: { senderId: user.id, status: "PENDING" } }),
  ]);

  const recentSent = await prisma.confession.findMany({
    where: { senderId: user.id },
    orderBy: { createdAt: "desc" },
    take: 3,
    select: { id: true, status: true, location: true, createdAt: true, mutualDetected: true },
  });

  return (
    <DashboardOverview
      user={{ name: user.name, id: user.id }}
      stats={{ sentCount, receivedCount, mutualCount, pendingCount }}
      recentSent={recentSent}
      confessionPageUnlocked={user.confessionPageUnlocked}
    />
  );
}
