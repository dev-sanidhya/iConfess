import {
  PendingProfileSearchKind,
  Prisma,
  SocialPlatform,
  type PrismaClient,
  type User,
} from "@prisma/client";
import { normalizeSocialHandle } from "@/lib/auth";
import { claimPendingProfileSearchCounts } from "@/lib/profile-search-count";
import { claimDirectShadowProfile } from "@/lib/shadow-profiles";

type DbClient = PrismaClient | Prisma.TransactionClient;

export function getUserVerifiedHandle(user: Pick<User, "instagramHandle" | "snapchatHandle">, platform: SocialPlatform) {
  return platform === "INSTAGRAM" ? user.instagramHandle : user.snapchatHandle;
}

export function getPendingProfileSearchKind(platform: SocialPlatform) {
  return platform === "INSTAGRAM"
    ? PendingProfileSearchKind.INSTAGRAM
    : PendingProfileSearchKind.SNAPCHAT;
}

export function getPlatformProfileUrl(platform: SocialPlatform, handle: string) {
  if (platform === "INSTAGRAM") {
    return `https://www.instagram.com/${handle}`;
  }

  return `https://www.snapchat.com/add/${handle}`;
}

export function toSocialPlatform(value: string | null | undefined) {
  if (value === "instagram" || value === "INSTAGRAM") return SocialPlatform.INSTAGRAM;
  if (value === "snapchat" || value === "SNAPCHAT") return SocialPlatform.SNAPCHAT;
  return null;
}

export async function submitPendingSocialOwnershipRequest(params: {
  user: Pick<User, "id" | "instagramHandle" | "snapchatHandle">;
  platform: SocialPlatform;
  handle: string;
  db: DbClient;
}) {
  const normalizedHandle = normalizeSocialHandle(params.handle);
  if (!normalizedHandle) {
    throw new Error("Enter a valid social handle before requesting verification.");
  }

  const currentVerifiedHandle = getUserVerifiedHandle(params.user, params.platform);
  if (currentVerifiedHandle === normalizedHandle) {
    return {
      request: null,
      normalizedHandle,
      alreadyVerified: true,
    };
  }

  const conflict = await params.db.user.findFirst({
    where: {
      id: { not: params.user.id },
      ...(params.platform === SocialPlatform.INSTAGRAM
        ? { instagramHandle: normalizedHandle }
        : { snapchatHandle: normalizedHandle }),
    },
    select: { id: true },
  });

  if (conflict) {
    throw new Error("This social handle is already verified by another user.");
  }

  const request = await params.db.pendingSocialOwnershipRequest.upsert({
    where: {
      userId_platform: {
        userId: params.user.id,
        platform: params.platform,
      },
    },
    update: {
      submittedHandle: params.handle.trim(),
      normalizedHandle,
    },
    create: {
      userId: params.user.id,
      platform: params.platform,
      submittedHandle: params.handle.trim(),
      normalizedHandle,
    },
  });

  return {
    request,
    normalizedHandle,
    alreadyVerified: false,
  };
}

async function markMutualForDeliveredTarget(targetUserId: string, db: DbClient) {
  const deliveredConfessions = await db.confession.findMany({
    where: {
      targetId: targetUserId,
      isSelfConfession: false,
    },
    select: {
      id: true,
      senderId: true,
    },
  });

  for (const confession of deliveredConfessions) {
    const reverse = await db.confession.findFirst({
      where: {
        senderId: targetUserId,
        targetId: confession.senderId,
        isSelfConfession: false,
      },
      select: { id: true },
    });

    if (!reverse) {
      continue;
    }

    await db.confession.updateMany({
      where: { id: { in: [confession.id, reverse.id] } },
      data: { mutualDetected: true },
    });
  }
}

export async function acceptPendingSocialOwnershipRequest(requestId: string, db: DbClient) {
  const request = await db.pendingSocialOwnershipRequest.findUnique({
    where: { id: requestId },
    include: {
      user: {
        select: {
          id: true,
          profileSearchCount: true,
        },
      },
    },
  });

  if (!request) {
    throw new Error("Verification request not found.");
  }

  const existingOwner = await db.user.findFirst({
    where: {
      id: { not: request.userId },
      ...(request.platform === SocialPlatform.INSTAGRAM
        ? { instagramHandle: request.normalizedHandle }
        : { snapchatHandle: request.normalizedHandle }),
    },
    select: { id: true },
  });

  if (existingOwner) {
    await db.pendingSocialOwnershipRequest.delete({ where: { id: request.id } });
    throw new Error("REMOVE_FROM_QUEUE::This social handle has already been verified for another user.");
  }

  const carriedSearchCount = await claimPendingProfileSearchCounts(
    [
      {
        kind: getPendingProfileSearchKind(request.platform),
        value: request.normalizedHandle,
      },
    ],
    db
  );
  const claimedShadow = await claimDirectShadowProfile({
    kind: getPendingProfileSearchKind(request.platform),
    value: request.normalizedHandle,
    userId: request.userId,
    db,
  });

  const userUpdate = request.platform === SocialPlatform.INSTAGRAM
    ? { instagramHandle: request.normalizedHandle }
    : { snapchatHandle: request.normalizedHandle };

  await db.user.update({
    where: { id: request.userId },
    data: {
      ...userUpdate,
      ...(carriedSearchCount > 0
        ? {
            profileSearchCount: (request.user.profileSearchCount ?? 0) + carriedSearchCount + (claimedShadow?.searchCount ?? 0),
          }
        : claimedShadow?.searchCount
          ? {
              profileSearchCount: (request.user.profileSearchCount ?? 0) + claimedShadow.searchCount,
            }
          : {}),
    },
  });

  const matchingConfessions = await db.confession.findMany({
    where: {
      targetId: null,
      targetPhone: null,
      status: "PENDING",
      expiresAt: { gt: new Date() },
      matchDetails: {
        path: ["platform"],
        equals: request.platform === SocialPlatform.INSTAGRAM ? "instagram" : "snapchat",
      },
    },
    select: {
      id: true,
      matchDetails: true,
    },
  });

  const confessionIdsToDeliver = matchingConfessions
    .filter((confession) => {
      const matchDetails = confession.matchDetails as Record<string, unknown>;
      return normalizeSocialHandle(typeof matchDetails.handle === "string" ? matchDetails.handle : "") === request.normalizedHandle;
    })
    .map((confession) => confession.id);

  if (confessionIdsToDeliver.length > 0) {
    await db.confession.updateMany({
      where: { id: { in: confessionIdsToDeliver } },
      data: {
        targetId: request.userId,
        status: "DELIVERED",
      },
    });
  }

  await markMutualForDeliveredTarget(request.userId, db);
  await db.pendingSocialOwnershipRequest.delete({ where: { id: request.id } });

  return request;
}

export async function rejectPendingSocialOwnershipRequest(requestId: string, db: DbClient) {
  await db.pendingSocialOwnershipRequest.delete({
    where: { id: requestId },
  });
}
