import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ConfessionsInbox from "@/components/ConfessionsInbox";

function buildAnonymousId(value: string) {
  return `AID-${value.slice(-6).toUpperCase()}`;
}

function buildLocationContext(
  location: string,
  profile:
    | {
        college?: { collegeName: string; course: string; branch: string; yearOfPassing: number } | null;
        school?: { schoolName: string; board: string; yearOfCompletion: number } | null;
        workplace?: { companyName: string; department: string; city: string; buildingName: string } | null;
        gym?: { gymName: string; city: string; timing: string } | null;
        neighbourhood?: { premisesName: string; city: string; homeNumber: string } | null;
      }
    | null
) {
  if (!profile) return null;

  if (location === "COLLEGE" && profile.college) {
    return `${profile.college.collegeName} · ${profile.college.course} · ${profile.college.branch} · ${profile.college.yearOfPassing}`;
  }

  if (location === "SCHOOL" && profile.school) {
    return `${profile.school.schoolName} · ${profile.school.board} · ${profile.school.yearOfCompletion}`;
  }

  if (location === "WORKPLACE" && profile.workplace) {
    return `${profile.workplace.companyName} · ${profile.workplace.department} · ${profile.workplace.city}`;
  }

  if (location === "GYM" && profile.gym) {
    return `${profile.gym.gymName} · ${profile.gym.city} · ${profile.gym.timing}`;
  }

  if (location === "NEIGHBOURHOOD" && profile.neighbourhood) {
    return `${profile.neighbourhood.premisesName} · ${profile.neighbourhood.city} · Home ${profile.neighbourhood.homeNumber}`;
  }

  return null;
}

export default async function ConfessionsPage() {
  const user = await getSession();
  if (!user) return null;

  const [receivedConfessions, sentConfessions] = await Promise.all([
    prisma.confession.findMany({
      where: { targetId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        unlockedBy: { where: { userId: user.id }, select: { id: true } },
        sender: {
          select: {
            id: true,
            name: true,
            college: { select: { collegeName: true, course: true, branch: true, yearOfPassing: true } },
            school: { select: { schoolName: true, board: true, yearOfCompletion: true } },
            workplace: { select: { companyName: true, department: true, city: true, buildingName: true } },
            gym: { select: { gymName: true, city: true, timing: true } },
            neighbourhood: { select: { premisesName: true, city: true, homeNumber: true } },
          },
        },
      },
    }),
    prisma.confession.findMany({
      where: { senderId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        target: {
          select: {
            id: true,
            name: true,
            college: { select: { collegeName: true, course: true, branch: true, yearOfPassing: true } },
            school: { select: { schoolName: true, board: true, yearOfCompletion: true } },
            workplace: { select: { companyName: true, department: true, city: true, buildingName: true } },
            gym: { select: { gymName: true, city: true, timing: true } },
            neighbourhood: { select: { premisesName: true, city: true, homeNumber: true } },
          },
        },
      },
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
    counterpartAnonymousId: buildAnonymousId(c.sender.id),
    counterpartName: c.revealedAt ? c.sender.name : null,
    counterpartContext: c.revealedAt ? buildLocationContext(c.location, c.sender) : null,
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
    counterpartAnonymousId: c.targetId ? buildAnonymousId(c.targetId) : buildAnonymousId(c.id),
    counterpartName: c.revealedAt ? c.target?.name ?? null : null,
    counterpartContext: c.revealedAt ? buildLocationContext(c.location, c.target) : null,
  }));

  return (
    <ConfessionsInbox
      receivedConfessions={received}
      sentConfessions={sent}
      pageUnlocked={user.confessionPageUnlocked}
    />
  );
}
