import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SendConfession from "@/components/SendConfession";

export default async function SendPage() {
  const user = await getSession();
  if (!user) return null;

  const sentCount = await prisma.confession.count({ where: { senderId: user.id } });

  const recentSent = await prisma.confession.findMany({
    where: { senderId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, status: true, location: true, createdAt: true,
      mutualDetected: true, reply: true, expiresAt: true,
    },
  });

  return (
    <SendConfession
      sentCount={sentCount}
      recentSent={recentSent.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
        expiresAt: c.expiresAt.toISOString(),
      }))}
    />
  );
}
