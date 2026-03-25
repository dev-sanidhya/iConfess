import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ConfessionsInbox from "@/components/ConfessionsInbox";

export default async function ConfessionsPage() {
  const user = await getSession();
  if (!user) return null;

  const [receivedConfessions, sentConfessions] = await Promise.all([
    prisma.confession.findMany({
      where: { targetId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        unlockedBy: { where: { userId: user.id }, select: { id: true } },
      },
    }),
    prisma.confession.findMany({
      where: { senderId: user.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const received = receivedConfessions.map((c) => ({
    id: c.id,
    direction: "received" as const,
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

  const sent = sentConfessions.map((c) => ({
    id: c.id,
    direction: "sent" as const,
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
    isUnlocked: true,
  }));

  return (
    <ConfessionsInbox
      receivedConfessions={received}
      sentConfessions={sent}
      pageUnlocked={user.confessionPageUnlocked}
    />
  );
}
