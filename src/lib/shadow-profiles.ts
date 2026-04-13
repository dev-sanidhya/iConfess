import {
  PendingProfileSearchKind,
  Prisma,
  PrismaClient,
  type ShadowProfile,
  type User,
} from "@prisma/client";
import { normalizeComparableFullName, normalizeComparableHandle, normalizeComparableValue } from "@/lib/confessions";
import { locationFields, type LocationCategory } from "@/lib/matching";
import { formatPhone } from "@/lib/utils";
import { claimPendingProfileSearchCounts } from "@/lib/profile-search-count";

type DbClient = PrismaClient | Prisma.TransactionClient;

type DetailRecord = Record<string, string>;

type ShadowProfileWithClaim = ShadowProfile & {
  claimedByUser: Pick<User, "id"> | null;
};

const DETAIL_KINDS: PendingProfileSearchKind[] = [
  PendingProfileSearchKind.COLLEGE,
  PendingProfileSearchKind.SCHOOL,
  PendingProfileSearchKind.WORKPLACE,
  PendingProfileSearchKind.GYM,
  PendingProfileSearchKind.NEIGHBOURHOOD,
];

export function getPendingKindForLocation(category: LocationCategory) {
  return PendingProfileSearchKind[category];
}

export function getPendingKindForPlatform(platform: "instagram" | "snapchat") {
  return platform === "instagram"
    ? PendingProfileSearchKind.INSTAGRAM
    : PendingProfileSearchKind.SNAPCHAT;
}

export function isDetailPendingKind(kind: PendingProfileSearchKind) {
  return DETAIL_KINDS.includes(kind);
}

export function normalizeShadowProfileInput(kind: PendingProfileSearchKind, input: Record<string, unknown>) {
  if (kind === PendingProfileSearchKind.PHONE) {
    return { phone: formatPhone(String(input.phone ?? "")) };
  }

  if (kind === PendingProfileSearchKind.INSTAGRAM || kind === PendingProfileSearchKind.SNAPCHAT) {
    return {
      handle: normalizeComparableHandle(input.handle),
      platform: kind === PendingProfileSearchKind.INSTAGRAM ? "instagram" : "snapchat",
      fullName: normalizeComparableFullName(input.fullName),
      firstName: normalizeComparableValue(input.firstName),
      lastName: normalizeComparableValue(input.lastName),
    };
  }

  const details = Object.fromEntries(
    Object.entries(input)
      .filter(([, value]) => typeof value === "string" || typeof value === "number")
      .map(([key, value]) => [key, normalizeComparableValue(String(value))])
      .filter(([, value]) => value)
      .sort(([left], [right]) => left.localeCompare(right))
  );

  return details;
}

export function buildPendingProfileSearchValue(kind: PendingProfileSearchKind, input: Record<string, unknown>) {
  const normalized = normalizeShadowProfileInput(kind, input);
  return JSON.stringify(normalized);
}

export function buildShadowProfileDisplayName(matchDetails: Record<string, unknown>) {
  const fullName = typeof matchDetails.fullName === "string" ? matchDetails.fullName.trim() : "";
  if (fullName) return fullName;

  return [
    typeof matchDetails.firstName === "string" ? matchDetails.firstName.trim() : "",
    typeof matchDetails.lastName === "string" ? matchDetails.lastName.trim() : "",
  ].filter(Boolean).join(" ").trim() || "Unregistered user";
}

export function matchesClaimedProfile(
  shadowProfile: Pick<ShadowProfile, "kind" | "profileDetails">,
  details: Record<string, string>,
  fullName: string
) {
  if (!isDetailPendingKind(shadowProfile.kind)) {
    return false;
  }

  const normalizedClaim = normalizeShadowProfileInput(shadowProfile.kind, {
    ...details,
    fullName,
  }) as DetailRecord;
  const storedDetails = shadowProfile.profileDetails as Record<string, unknown>;
  const normalizedStored = normalizeShadowProfileInput(shadowProfile.kind, storedDetails) as DetailRecord;

  return Object.entries(normalizedStored).every(([key, value]) => {
    if (!value) return true;
    return normalizedClaim[key] === value;
  });
}

export function isFullDetailShadowProfile(
  kind: PendingProfileSearchKind,
  profileDetails: Record<string, unknown>
) {
  if (!isDetailPendingKind(kind)) {
    return true;
  }

  const category = kind as unknown as LocationCategory;
  const normalized = normalizeShadowProfileInput(kind, profileDetails) as DetailRecord;
  const hasFullName = Boolean(normalized.fullName);

  return hasFullName && locationFields[category].every((field) => Boolean(normalized[field.key]));
}

export async function findOrCreateDirectShadowProfile(params: {
  kind: PendingProfileSearchKind;
  value: string;
  location?: LocationCategory | null;
  matchDetails: Record<string, unknown>;
  db: DbClient;
}) {
  const existing = await params.db.shadowProfile.findFirst({
    where: {
      kind: params.kind,
      value: params.value,
      claimedByUserId: null,
    },
  });

  if (existing) {
    return existing;
  }

  const carriedSearchCount = await claimPendingProfileSearchCounts(
    [{ kind: params.kind, value: params.value }],
    params.db
  );

  return params.db.shadowProfile.create({
    data: {
      kind: params.kind,
      value: params.value,
      location: params.location ?? null,
      displayName: buildShadowProfileDisplayName(params.matchDetails),
      profileDetails: params.matchDetails as Prisma.InputJsonValue,
      searchCount: carriedSearchCount,
    },
  });
}

export async function incrementShadowProfileSearchCount(shadowProfileIds: string[], db: DbClient) {
  const uniqueShadowIds = [...new Set(shadowProfileIds.filter(Boolean))];
  if (uniqueShadowIds.length === 0) return;

  await db.shadowProfile.updateMany({
    where: { id: { in: uniqueShadowIds } },
    data: { searchCount: { increment: 1 } },
  });
}

export async function claimCompatiblePendingDetailSearchCounts(params: {
  category: LocationCategory;
  details: Record<string, string>;
  fullName: string;
  db: DbClient;
}) {
  const kind = getPendingKindForLocation(params.category);
  const claimedDetails = normalizeShadowProfileInput(kind, {
    ...params.details,
    fullName: params.fullName,
  }) as DetailRecord;

  const records = await params.db.pendingProfileSearchCount.findMany({
    where: { kind },
  });

  const matchingRecords = records.filter((record) => {
    try {
      const parsed = JSON.parse(record.value) as DetailRecord;
      return Object.entries(parsed).every(([key, value]) => claimedDetails[key] === value);
    } catch {
      return false;
    }
  });

  if (matchingRecords.length > 0) {
    await params.db.pendingProfileSearchCount.deleteMany({
      where: { id: { in: matchingRecords.map((record) => record.id) } },
    });
  }

  return matchingRecords.reduce((sum, record) => sum + record.count, 0);
}

export async function claimDirectShadowProfile(params: {
  kind: PendingProfileSearchKind;
  value: string;
  userId: string;
  db: DbClient;
}) {
  const shadow = await params.db.shadowProfile.findFirst({
    where: {
      kind: params.kind,
      value: params.value,
      claimedByUserId: null,
    },
    select: {
      id: true,
      searchCount: true,
    },
  });

  if (!shadow) {
    return null;
  }

  await params.db.shadowProfile.update({
    where: { id: shadow.id },
    data: { claimedByUserId: params.userId },
  });

  await params.db.confession.updateMany({
    where: {
      shadowProfileId: shadow.id,
      targetId: null,
      status: "PENDING",
      expiresAt: { gt: new Date() },
    },
    data: {
      targetId: params.userId,
      status: "DELIVERED",
    },
  });

  return shadow;
}

export async function deleteShadowProfileIfEmpty(shadowProfileId: string, db: DbClient) {
  const remaining = await db.confession.count({
    where: {
      shadowProfileId,
      targetId: null,
      status: { in: ["PENDING", "DELIVERED", "OPENED", "REPLIED", "GHOSTED"] },
    },
  });

  if (remaining > 0) return;

  await db.shadowProfile.deleteMany({
    where: { id: shadowProfileId, claimedByUserId: null },
  });
}

export function shadowProfileMatchesSearch(params: {
  shadowProfile: Pick<ShadowProfileWithClaim, "kind" | "profileDetails">;
  mode: "phone" | "social" | "profile";
  location?: LocationCategory | null;
  phone?: string;
  platform?: "instagram" | "snapchat";
  handle?: string;
  details?: Record<string, string>;
}) {
  const stored = params.shadowProfile.profileDetails as Record<string, unknown>;

  if (params.mode === "phone") {
    const storedPhone = typeof stored.phone === "string" ? formatPhone(stored.phone) : "";
    return Boolean(params.phone && storedPhone === formatPhone(params.phone));
  }

  if (params.mode === "social") {
    const storedHandle = normalizeComparableHandle(stored.handle);
    const storedPlatform = typeof stored.platform === "string" ? stored.platform : "";
    return Boolean(
      params.platform &&
        params.handle &&
        storedPlatform === params.platform &&
        storedHandle === normalizeComparableHandle(params.handle)
    );
  }

  if (!params.location) return false;
  if (!isDetailPendingKind(params.shadowProfile.kind)) return false;
  if ((params.shadowProfile.kind as unknown as LocationCategory) !== params.location) return false;

  const normalizedStored = normalizeShadowProfileInput(params.shadowProfile.kind, stored) as DetailRecord;
  const queryDetails = params.details ?? {};

  return Object.entries(queryDetails).every(([key, value]) => {
    const normalizedQuery = normalizeComparableValue(value);
    if (!normalizedQuery) return true;

    const storedValue = normalizedStored[key] ?? "";
    if (!storedValue) return false;

    return storedValue.includes(normalizedQuery);
  });
}
