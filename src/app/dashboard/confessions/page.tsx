import { getSession } from "@/lib/auth";
import ConfessionsInbox from "@/components/ConfessionsInbox";
import { prisma } from "@/lib/prisma";
import { formatSharedProfileDetails, getStoredSharedProfileSnapshot } from "@/lib/shared-profile-context";

function buildAnonymousId(value: string) {
  return `AID-${value.slice(-6).toUpperCase()}`;
}

function buildTrashAnonymousId(confessionId: string) {
  return `AID-${confessionId.slice(-6).toUpperCase()}`;
}

function getStringDetail(details: Record<string, unknown>, key: string) {
  const value = details[key];
  return typeof value === "string" ? value : "";
}

function normalizeJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeJsonValue(entry));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entryValue]) => [key, normalizeJsonValue(entryValue)])
    );
  }

  if (typeof value === "string") {
    return value.trim();
  }

  return value;
}

function buildSentDedupKey(confession: {
  targetId: string | null;
  targetPhone: string | null;
  location: string;
  message: string;
  matchDetails: unknown;
  status: string;
  reply: string | null;
  revealedAt: Date | null;
}) {
  return JSON.stringify({
    targetId: confession.targetId,
    targetPhone: confession.targetPhone,
    location: confession.location,
    message: confession.message.trim(),
    matchDetails: normalizeJsonValue(confession.matchDetails),
    status: confession.status,
    reply: confession.reply,
    revealedAt: confession.revealedAt?.toISOString() ?? null,
  });
}

function dedupeSentConfessions<T extends {
  targetId: string | null;
  targetPhone: string | null;
  location: string;
  message: string;
  matchDetails: unknown;
  status: string;
  reply: string | null;
  revealedAt: Date | null;
}>(confessions: T[]) {
  const seen = new Set<string>();

  return confessions.filter((confession) => {
    const key = buildSentDedupKey(confession);
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function buildEnteredRecipientName(details: Record<string, unknown>) {
  const fullName = getStringDetail(details, "fullName").trim();
  if (fullName) return fullName;

  const composedName = [
    getStringDetail(details, "firstName").trim(),
    getStringDetail(details, "lastName").trim(),
  ].filter(Boolean).join(" ").trim();

  return composedName || null;
}

function buildEnteredRecipientContext(
  location: string,
  details: Record<string, unknown>,
  targetPhone: string | null
) {
  if (targetPhone) {
    return `Phone: ${targetPhone}`;
  }

  const platform = getStringDetail(details, "platform");
  const handle = getStringDetail(details, "handle");

  if (platform && handle) {
    const platformLabel = platform === "instagram" ? "Instagram" : platform === "snapchat" ? "Snapchat" : "Social";
    return `${platformLabel}: @${handle.replace(/^@+/, "")}`;
  }

  if (location === "COLLEGE") {
    return [
      getStringDetail(details, "collegeName"),
      getStringDetail(details, "course"),
      getStringDetail(details, "branch"),
      getStringDetail(details, "yearOfPassing"),
    ].filter(Boolean).join(" · ") || null;
  }

  if (location === "SCHOOL") {
    return [
      getStringDetail(details, "schoolName"),
      getStringDetail(details, "board"),
      getStringDetail(details, "yearOfCompletion"),
    ].filter(Boolean).join(" · ") || null;
  }

  if (location === "WORKPLACE") {
    return [
      getStringDetail(details, "companyName"),
      getStringDetail(details, "department"),
      getStringDetail(details, "city"),
    ].filter(Boolean).join(" · ") || null;
  }

  if (location === "GYM") {
    return [
      getStringDetail(details, "gymName"),
      getStringDetail(details, "city"),
      getStringDetail(details, "timing"),
    ].filter(Boolean).join(" · ") || null;
  }

  if (location === "NEIGHBOURHOOD") {
    return [
      getStringDetail(details, "premisesName"),
      getStringDetail(details, "city"),
      getStringDetail(details, "homeNumber"),
    ].filter(Boolean).join(" · ") || null;
  }

  return null;
}

function buildLocationContext(
  location: string,
  profile:
    | {
        college?: { collegeName: string; course: string; branch: string; yearOfPassing: number } | null;
        school?: { schoolName: string; board: string; yearOfCompletion: number } | null;
        workplace?: { companyName: string; department: string; city: string } | null;
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
            gender: true,
            college: { select: { collegeName: true, course: true, branch: true, yearOfPassing: true } },
            school: { select: { schoolName: true, board: true, yearOfCompletion: true } },
            workplace: { select: { companyName: true, department: true, city: true } },
            gym: { select: { gymName: true, city: true, timing: true } },
            neighbourhood: { select: { premisesName: true, city: true, homeNumber: true } },
          },
        },
      },
    }),
    prisma.confession.findMany({
      where: { senderId: user.id, isSelfConfession: false },
      orderBy: { createdAt: "desc" },
      include: {
        target: {
          select: {
            id: true,
            name: true,
            gender: true,
            college: { select: { collegeName: true, course: true, branch: true, yearOfPassing: true } },
            school: { select: { schoolName: true, board: true, yearOfCompletion: true } },
            workplace: { select: { companyName: true, department: true, city: true } },
            gym: { select: { gymName: true, city: true, timing: true } },
            neighbourhood: { select: { premisesName: true, city: true, homeNumber: true } },
          },
        },
      },
    }),
  ]);

  const received = receivedConfessions.map((confession) => {
    const matchDetails = confession.matchDetails as Record<string, unknown>;
    const sharedProfileSnapshot = getStoredSharedProfileSnapshot(matchDetails);

    return {
      id: confession.id,
      direction: "received" as const,
      location: confession.location,
      matchDetails,
      message: confession.message,
      status: confession.status,
      reply: confession.reply,
      repliedAt: confession.repliedAt?.toISOString() ?? null,
      createdAt: confession.createdAt.toISOString(),
      mutualDetected: confession.mutualDetected,
      senderRevealConsent: confession.senderRevealConsent,
      targetRevealConsent: confession.targetRevealConsent,
      revealedAt: confession.revealedAt?.toISOString() ?? null,
      isUnlocked: confession.unlockedBy.length > 0,
      counterpartAnonymousId: confession.isSelfConfession
        ? buildTrashAnonymousId(confession.id)
        : buildAnonymousId(confession.sender.id),
      counterpartName: confession.revealedAt ? confession.sender.name : null,
      counterpartGender: confession.selfGenderOverride ?? confession.sender.gender,
      counterpartContext:
        confession.revealedAt && sharedProfileSnapshot
          ? formatSharedProfileDetails(sharedProfileSnapshot.details)
          : null,
    };
  });

  const sent = dedupeSentConfessions(sentConfessions).map((confession) => {
    const matchDetails = confession.matchDetails as Record<string, unknown>;
    const fallbackRecipientName = buildEnteredRecipientName(matchDetails);

    return {
      id: confession.id,
      direction: "sent" as const,
      location: confession.location,
      matchDetails,
      message: confession.message,
      status: confession.status,
      reply: confession.reply,
      repliedAt: confession.repliedAt?.toISOString() ?? null,
      createdAt: confession.createdAt.toISOString(),
      mutualDetected: confession.mutualDetected,
      senderRevealConsent: confession.senderRevealConsent,
      targetRevealConsent: confession.targetRevealConsent,
      revealedAt: confession.revealedAt?.toISOString() ?? null,
      isUnlocked: true,
      counterpartAnonymousId: confession.targetId ? buildAnonymousId(confession.targetId) : buildAnonymousId(confession.id),
      counterpartName: confession.target?.name ?? fallbackRecipientName,
      counterpartGender: confession.target?.gender ?? null,
      counterpartContext:
        buildLocationContext(confession.location, confession.target) ??
        buildEnteredRecipientContext(confession.location, matchDetails, confession.targetPhone),
    };
  });

  return (
    <ConfessionsInbox
      receivedConfessions={received}
      sentConfessions={sent}
      pageUnlocked={user.confessionPageUnlocked}
    />
  );
}
