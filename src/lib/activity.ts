import { ActivityType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const VISIT_TIMEOUT_MS = 30 * 60 * 1000;

export async function recordUserActivity(params: {
  userId?: string | null;
  anonymousId?: string | null;
  type: ActivityType;
  path?: string | null;
  occurredAt?: Date;
}) {
  const occurredAt = params.occurredAt ?? new Date();

  const existingSession = await prisma.visitSession.findFirst({
    where: params.userId
      ? { userId: params.userId }
      : { anonymousId: params.anonymousId ?? undefined },
    orderBy: { lastActivityAt: "desc" },
  });

  const shouldCreateNewSession =
    !existingSession ||
    occurredAt.getTime() - existingSession.lastActivityAt.getTime() > VISIT_TIMEOUT_MS;

  const visitSession = shouldCreateNewSession
    ? await prisma.visitSession.create({
        data: {
          userId: params.userId ?? null,
          anonymousId: params.anonymousId ?? null,
          startedAt: occurredAt,
          lastActivityAt: occurredAt,
        },
      })
    : await prisma.visitSession.update({
        where: { id: existingSession.id },
        data: { lastActivityAt: occurredAt },
      });

  await prisma.userActivity.create({
    data: {
      userId: params.userId ?? null,
      visitSessionId: visitSession.id,
      type: params.type,
      path: params.path ?? null,
      createdAt: occurredAt,
    },
  });

  return visitSession;
}
