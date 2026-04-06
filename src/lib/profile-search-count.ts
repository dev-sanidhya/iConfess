import { PendingProfileSearchKind, Prisma, PrismaClient } from "@prisma/client";

type DbClient = PrismaClient | Prisma.TransactionClient;

const MIN_INITIAL_PROFILE_SEARCH_COUNT = 5;
const MAX_INITIAL_PROFILE_SEARCH_COUNT = 7;

function getRandomInitialProfileSearchCount() {
  return Math.floor(Math.random() * (MAX_INITIAL_PROFILE_SEARCH_COUNT - MIN_INITIAL_PROFILE_SEARCH_COUNT + 1)) + MIN_INITIAL_PROFILE_SEARCH_COUNT;
}

export async function ensureProfileSearchCountSeeded(userId: string, db: DbClient) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { profileSearchCount: true },
  });

  if (!user) return 0;
  if (user.profileSearchCount !== null) return user.profileSearchCount;

  const seededCount = getRandomInitialProfileSearchCount();
  await db.user.update({
    where: { id: userId },
    data: { profileSearchCount: seededCount },
  });
  return seededCount;
}

export async function incrementProfileSearchCounts(userIds: string[], db: DbClient) {
  const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
  if (uniqueUserIds.length === 0) return;

  const users = await db.user.findMany({
    where: { id: { in: uniqueUserIds } },
    select: { id: true, profileSearchCount: true },
  });

  await Promise.all(
    users.map((user) =>
      db.user.update({
        where: { id: user.id },
        data: {
          profileSearchCount: (user.profileSearchCount ?? getRandomInitialProfileSearchCount()) + 1,
        },
      })
    )
  );
}

export async function incrementPendingProfileSearchCount(
  kind: PendingProfileSearchKind,
  value: string,
  db: DbClient
) {
  if (!value) return;

  await db.pendingProfileSearchCount.upsert({
    where: { kind_value: { kind, value } },
    update: { count: { increment: 1 } },
    create: { kind, value, count: 1 },
  });
}

export async function claimPendingProfileSearchCounts(
  identifiers: { kind: PendingProfileSearchKind; value: string | null | undefined }[],
  db: DbClient
) {
  const validIdentifiers = identifiers.filter(
    (identifier): identifier is { kind: PendingProfileSearchKind; value: string } => Boolean(identifier.value)
  );

  if (validIdentifiers.length === 0) {
    return 0;
  }

  const records = await db.pendingProfileSearchCount.findMany({
    where: {
      OR: validIdentifiers.map((identifier) => ({
        kind: identifier.kind,
        value: identifier.value,
      })),
    },
    select: { id: true, count: true },
  });

  if (records.length > 0) {
    await db.pendingProfileSearchCount.deleteMany({
      where: { id: { in: records.map((record) => record.id) } },
    });
  }

  return records.reduce((sum, record) => sum + record.count, 0);
}

export function createInitialProfileSearchCount(extraSearches = 0) {
  return getRandomInitialProfileSearchCount() + Math.max(0, extraSearches);
}
