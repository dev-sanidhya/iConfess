import { type Confession, type Gender, type PrismaClient, type User } from "@prisma/client";
import { locationFields, type LocationCategory } from "@/lib/matching";
import { formatPhone } from "@/lib/utils";

type Tx = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

type UserWithProfiles = Pick<User, "id" | "name" | "phone" | "instagramHandle" | "snapchatHandle" | "gender"> & {
  college?: Record<string, unknown> | null;
  school?: Record<string, unknown> | null;
  workplace?: Record<string, unknown> | null;
  gym?: Record<string, unknown> | null;
  neighbourhood?: Record<string, unknown> | null;
};

type SelfClaimSnapshot = {
  fullName: string;
  phone: string;
  instagramHandle: string | null;
  snapchatHandle: string | null;
  profiles: Partial<Record<LocationCategory, Record<string, string>>>;
};

type SentConfessionLike = {
  senderId?: string;
  targetId: string | null;
  targetPhone: string | null;
  location: string;
  message: string;
  matchDetails: unknown;
  status: string;
  reply: string | null;
  revealedAt: Date | null;
};

export function normalizeComparableValue(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function normalizeComparableFullName(value: unknown) {
  return normalizeComparableValue(value);
}

export function normalizeComparableHandle(value: unknown) {
  return normalizeComparableValue(value).replace(/^@+/, "");
}

function stringifyProfileValue(value: unknown) {
  if (typeof value === "number") return String(value);
  return typeof value === "string" ? value : "";
}

function getMatchDetailsRecord(confession: Pick<Confession, "matchDetails">) {
  return confession.matchDetails as Record<string, unknown>;
}

export async function countSentConfessionsToOthers(userId: string, db: Tx) {
  const confessions = await db.confession.findMany({
    where: {
      senderId: userId,
      isSelfConfession: false,
    },
    orderBy: { createdAt: "desc" },
    select: {
      targetId: true,
      targetPhone: true,
      location: true,
      message: true,
      matchDetails: true,
      status: true,
      reply: true,
      revealedAt: true,
    },
  });

  return dedupeSentConfessions(confessions).length;
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

function buildSentDedupKey(confession: SentConfessionLike) {
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

export function dedupeSentConfessions<T extends SentConfessionLike>(confessions: T[]) {
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

export function buildCanonicalSentCountsBySender<T extends SentConfessionLike & { senderId: string }>(
  confessions: T[]
) {
  const deduped = dedupeSentConfessions(confessions);
  const counts = new Map<string, number>();

  for (const confession of deduped) {
    counts.set(confession.senderId, (counts.get(confession.senderId) ?? 0) + 1);
  }

  return counts;
}

export function buildSelfClaimSnapshot(
  user: UserWithProfiles,
  profileOverrides?: Partial<Record<LocationCategory, Record<string, string>>>,
  overrideName?: string,
  overrideInstagramHandle?: string | null,
  overrideSnapchatHandle?: string | null
): SelfClaimSnapshot {
  return {
    fullName: normalizeComparableFullName(overrideName ?? user.name),
    phone: formatPhone(user.phone),
    instagramHandle: normalizeComparableHandle(overrideInstagramHandle ?? user.instagramHandle ?? "") || null,
    snapchatHandle: normalizeComparableHandle(overrideSnapchatHandle ?? user.snapchatHandle ?? "") || null,
    profiles: {
      COLLEGE: profileOverrides?.COLLEGE ?? extractProfileValues(user.college, "COLLEGE"),
      SCHOOL: profileOverrides?.SCHOOL ?? extractProfileValues(user.school, "SCHOOL"),
      WORKPLACE: profileOverrides?.WORKPLACE ?? extractProfileValues(user.workplace, "WORKPLACE"),
      GYM: profileOverrides?.GYM ?? extractProfileValues(user.gym, "GYM"),
      NEIGHBOURHOOD: profileOverrides?.NEIGHBOURHOOD ?? extractProfileValues(user.neighbourhood, "NEIGHBOURHOOD"),
    },
  };
}

function extractProfileValues(profile: Record<string, unknown> | null | undefined, category: LocationCategory) {
  if (!profile) return undefined;

  return Object.fromEntries(
    locationFields[category].map((field) => [field.key, stringifyProfileValue(profile[field.key])])
  );
}

export function confessionMatchesSelfClaim(
  confession: Pick<Confession, "location" | "matchDetails" | "targetPhone">,
  snapshot: SelfClaimSnapshot
) {
  const matchDetails = getMatchDetailsRecord(confession);
  const matchFullName = normalizeComparableFullName(matchDetails.fullName);

  if (!matchFullName || matchFullName !== snapshot.fullName) {
    return false;
  }

  if (confession.targetPhone) {
    return formatPhone(confession.targetPhone) === snapshot.phone;
  }

  const platform = normalizeComparableValue(matchDetails.platform);
  const handle = normalizeComparableHandle(matchDetails.handle);

  if (platform === "instagram") {
    return Boolean(handle && snapshot.instagramHandle && handle === snapshot.instagramHandle);
  }

  if (platform === "snapchat") {
    return Boolean(handle && snapshot.snapchatHandle && handle === snapshot.snapchatHandle);
  }

  const category = confession.location as LocationCategory;
  const profile = snapshot.profiles[category];
  if (!profile) return false;

  return locationFields[category].every((field) => {
    const storedValue = stringifyProfileValue(matchDetails[field.key]);
    if (!storedValue.trim()) return true;
    return normalizeComparableValue(storedValue) === normalizeComparableValue(profile[field.key]);
  });
}

export async function convertConfessionToSelf(
  confessionId: string,
  userId: string,
  db: Tx,
  selfGenderOverride?: Gender | null
) {
  return db.confession.update({
    where: { id: confessionId },
    data: {
      targetId: userId,
      status: "DELIVERED",
      isSelfConfession: true,
      billingCategory: "CONFESSION_TO_YOURSELF",
      billingState: "PAID",
      mutualDetected: false,
      selfGenderOverride: selfGenderOverride ?? null,
    },
  });
}
