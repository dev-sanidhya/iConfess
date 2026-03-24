import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ConfessionsInbox from "@/components/ConfessionsInbox";

export default async function ConfessionsPage() {
  const user = await getSession();
  if (!user) return null;

  const confessions = await prisma.confession.findMany({
    where: { targetId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      unlockedBy: { where: { userId: user.id }, select: { id: true } },
    },
  });

  const serialized = confessions.map((c) => ({
    id: c.id,
    location: c.location,
    matchDetails: c.matchDetails as Record<string, string>,
    message: c.message,
    status: c.status,
    reply: c.reply,
    repliedAt: c.repliedAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
    mutualDetected: c.mutualDetected,
    senderRevealConsent: c.senderRevealConsent,
    targetRevealConsent: c.targetRevealConsent,
    revealedAt: c.revealedAt?.toISOString() ?? null,
    isUnlocked: c.unlockedBy.length > 0,
  }));

  return (
    <ConfessionsInbox
      confessions={serialized}
      pageUnlocked={user.confessionPageUnlocked}
    />
  );
}
