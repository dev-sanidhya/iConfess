import { Gender, PaymentType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calculateAge, getAgeBucket, matchesAgeFilters, type AgeBucketKey } from "@/lib/age";

export type AnalyticsFilters = {
  startDate?: Date | null;
  endDate?: Date | null;
  gender?: Gender | null;
  ageBucket?: AgeBucketKey | null;
  specificAge?: number | null;
};

function inDateRange(date: Date, startDate?: Date | null, endDate?: Date | null) {
  if (startDate && date < startDate) {
    return false;
  }

  if (endDate && date > endDate) {
    return false;
  }

  return true;
}

function toDistribution(values: number[]) {
  return [...new Map(values.sort((a, b) => a - b).map((value) => [value, (values.filter((item) => item === value)).length]))].map(
    ([count, users]) => ({ count, users })
  );
}

function getFieldFilledCount(values: Array<string | null | undefined>) {
  return values.filter((value) => typeof value === "string" && value.trim().length > 0).length;
}

export async function getAnalyticsSnapshot(filters: AnalyticsFilters) {
  const users = await prisma.user.findMany({
    where: filters.gender ? { gender: filters.gender } : undefined,
    include: {
      college: true,
      school: true,
      workplace: true,
      gym: true,
      neighbourhood: true,
    },
  });

  const filteredUsers = users.filter((user) =>
    matchesAgeFilters(user.dateOfBirth, filters.ageBucket, filters.specificAge)
  );
  const filteredUserIds = filteredUsers.map((user) => user.id);
  const filteredUserIdSet = new Set(filteredUserIds);

  const [
    payments,
    visits,
    sentConfessions,
    receivedConfessions,
    mutualConfessions,
    selfConfessions,
  ] = await Promise.all([
    prisma.payment.findMany({
      where: {
        userId: { in: filteredUserIds.length ? filteredUserIds : ["__none__"] },
      },
    }),
    prisma.visitSession.findMany({
      where: {
        userId: { in: filteredUserIds.length ? filteredUserIds : ["__none__"] },
      },
    }),
    prisma.confession.findMany({
      where: {
        senderId: { in: filteredUserIds.length ? filteredUserIds : ["__none__"] },
      },
      select: {
        id: true,
        createdAt: true,
        senderId: true,
        targetId: true,
        targetPhone: true,
        isSelfConfession: true,
        location: true,
        mutualDetected: true,
        matchDetails: true,
      },
    }),
    prisma.confession.findMany({
      where: {
        targetId: { in: filteredUserIds.length ? filteredUserIds : ["__none__"] },
      },
      select: {
        id: true,
        createdAt: true,
        senderId: true,
        targetId: true,
      },
    }),
    prisma.confession.findMany({
      where: {
        mutualDetected: true,
        OR: [
          { senderId: { in: filteredUserIds.length ? filteredUserIds : ["__none__"] } },
          { targetId: { in: filteredUserIds.length ? filteredUserIds : ["__none__"] } },
        ],
      },
      select: {
        id: true,
        senderId: true,
        targetId: true,
        createdAt: true,
      },
    }),
    prisma.confession.findMany({
      where: {
        senderId: { in: filteredUserIds.length ? filteredUserIds : ["__none__"] },
        isSelfConfession: true,
      },
      select: {
        id: true,
        senderId: true,
        createdAt: true,
      },
    }),
  ]);

  const registeredUsers = filteredUsers.filter((user) =>
    inDateRange(user.createdAt, filters.startDate, filters.endDate)
  );

  const paymentEvents = payments.filter((payment) =>
    inDateRange(payment.createdAt, filters.startDate, filters.endDate)
  );
  const visitEvents = visits.filter((visit) =>
    inDateRange(visit.startedAt, filters.startDate, filters.endDate)
  );
  const sentEvents = sentConfessions.filter((confession) =>
    inDateRange(confession.createdAt, filters.startDate, filters.endDate)
  );
  const receivedEvents = receivedConfessions.filter((confession) =>
    inDateRange(confession.createdAt, filters.startDate, filters.endDate)
  );
  const mutualEvents = mutualConfessions.filter((confession) =>
    inDateRange(confession.createdAt, filters.startDate, filters.endDate)
  );
  const selfEvents = selfConfessions.filter((confession) =>
    inDateRange(confession.createdAt, filters.startDate, filters.endDate)
  );

  const paymentsByType = Object.values(PaymentType).map((type) => {
    const items = paymentEvents.filter((payment) => payment.type === type);
    const countsByUser = new Map<string, number>();
    for (const item of items) {
      countsByUser.set(item.userId, (countsByUser.get(item.userId) ?? 0) + 1);
    }

    return {
      type,
      totalPurchases: items.length,
      uniqueUsers: countsByUser.size,
      repeatDistribution: toDistribution([...countsByUser.values()]),
    };
  });

  const visitCountsByUser = new Map<string, number>();
  for (const visit of visitEvents) {
    if (!visit.userId) continue;
    visitCountsByUser.set(visit.userId, (visitCountsByUser.get(visit.userId) ?? 0) + 1);
  }

  const sentCountsByUser = new Map<string, number>();
  const confessionMethod = {
    phone: 0,
    social: 0,
    instagram: 0,
    snapchat: 0,
    details: 0,
    college: 0,
    school: 0,
    workplace: 0,
    gym: 0,
    neighbourhood: 0,
  };

  for (const confession of sentEvents) {
    sentCountsByUser.set(confession.senderId, (sentCountsByUser.get(confession.senderId) ?? 0) + 1);

    const matchDetails = confession.matchDetails as Record<string, unknown>;
    const platform = typeof matchDetails.platform === "string" ? matchDetails.platform : null;

    if (confession.targetPhone) {
      confessionMethod.phone += 1;
      continue;
    }

    if (platform === "instagram" || platform === "snapchat") {
      confessionMethod.social += 1;
      if (platform === "instagram") confessionMethod.instagram += 1;
      if (platform === "snapchat") confessionMethod.snapchat += 1;
      continue;
    }

    confessionMethod.details += 1;
    if (confession.location === "COLLEGE") confessionMethod.college += 1;
    if (confession.location === "SCHOOL") confessionMethod.school += 1;
    if (confession.location === "WORKPLACE") confessionMethod.workplace += 1;
    if (confession.location === "GYM") confessionMethod.gym += 1;
    if (confession.location === "NEIGHBOURHOOD") confessionMethod.neighbourhood += 1;
  }

  const receivedCountsByUser = new Map<string, number>();
  for (const confession of receivedEvents) {
    if (!confession.targetId) continue;
    receivedCountsByUser.set(confession.targetId, (receivedCountsByUser.get(confession.targetId) ?? 0) + 1);
  }

  const selfCountsByUser = new Map<string, number>();
  for (const confession of selfEvents) {
    selfCountsByUser.set(confession.senderId, (selfCountsByUser.get(confession.senderId) ?? 0) + 1);
  }

  const mutualUserSet = new Set<string>();
  for (const confession of mutualEvents) {
    if (filteredUserIdSet.has(confession.senderId)) {
      mutualUserSet.add(confession.senderId);
    }
    if (confession.targetId && filteredUserIdSet.has(confession.targetId)) {
      mutualUserSet.add(confession.targetId);
    }
  }

  const profileFieldCounts = {
    instagramHandle: getFieldFilledCount(filteredUsers.map((user) => user.instagramHandle)),
    snapchatHandle: getFieldFilledCount(filteredUsers.map((user) => user.snapchatHandle)),
    collegeDetails: filteredUsers.filter((user) => Boolean(user.college)).length,
    schoolDetails: filteredUsers.filter((user) => Boolean(user.school)).length,
    workplaceDetails: filteredUsers.filter((user) => Boolean(user.workplace)).length,
    gymDetails: filteredUsers.filter((user) => Boolean(user.gym)).length,
    neighbourhoodDetails: filteredUsers.filter((user) => Boolean(user.neighbourhood)).length,
  };

  const specificAgeDistribution = filteredUsers.reduce<Record<number, number>>((acc, user) => {
    if (!user.dateOfBirth) {
      return acc;
    }
    const age = calculateAge(user.dateOfBirth);
    acc[age] = (acc[age] ?? 0) + 1;
    return acc;
  }, {});

  const ageBucketDistribution = filteredUsers.reduce<Record<string, number>>((acc, user) => {
    if (!user.dateOfBirth) {
      acc.Unknown = (acc.Unknown ?? 0) + 1;
      return acc;
    }
    const bucket = getAgeBucket(calculateAge(user.dateOfBirth)) ?? "Unknown";
    acc[bucket] = (acc[bucket] ?? 0) + 1;
    return acc;
  }, {});

  return {
    filtersApplied: {
      totalUsersInDemographicScope: filteredUsers.length,
    },
    registrations: {
      total: registeredUsers.length,
      genderBreakdown: filteredUsers.reduce<Record<string, number>>((acc, user) => {
        if (!inDateRange(user.createdAt, filters.startDate, filters.endDate)) {
          return acc;
        }
        acc[user.gender] = (acc[user.gender] ?? 0) + 1;
        return acc;
      }, {}),
      ageBucketBreakdown: ageBucketDistribution,
      specificAgeBreakdown: specificAgeDistribution,
    },
    purchases: paymentsByType,
    visits: {
      totalVisits: visitEvents.length,
      uniqueVisitors: visitCountsByUser.size,
      repeatVisitors: [...visitCountsByUser.values()].filter((count) => count > 1).length,
      visitCountDistribution: toDistribution([...visitCountsByUser.values()]),
    },
    confessions: {
      totalSent: sentEvents.length,
      totalReceived: receivedEvents.length,
      sentCountDistribution: toDistribution([...sentCountsByUser.values()]),
      receivedCountDistribution: toDistribution([...receivedCountsByUser.values()]),
      usersWhoSent: sentCountsByUser.size,
      usersWhoReceived: receivedCountsByUser.size,
      mutualUsers: mutualUserSet.size,
      mutualConfessionRecords: mutualEvents.length,
    },
    profileCompletion: profileFieldCounts,
    confessionMethod,
    selfConfessions: {
      uniqueUsers: selfCountsByUser.size,
      totalConfessions: selfEvents.length,
      selfCountDistribution: toDistribution([...selfCountsByUser.values()]),
    },
  };
}
