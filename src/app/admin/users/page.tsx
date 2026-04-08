import UsersManagementPanel from "@/components/UsersManagementPanel";
import { buildCanonicalSentCountsBySender } from "@/lib/confessions";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/staff-guards";

type AdminUsersPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  await requireAdmin();
  const params = await searchParams;
  const phoneQuery = typeof params.phone === "string" ? params.phone.trim() : "";

  const users = await prisma.user.findMany({
    where: phoneQuery
      ? {
          phone: {
            contains: phoneQuery,
          },
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          receivedConfessions: true,
          payments: true,
        },
      },
    },
    take: 100,
  });

  const sentConfessions = await prisma.confession.findMany({
    where: {
      senderId: { in: users.map((user) => user.id) },
      isSelfConfession: false,
    },
    orderBy: { createdAt: "desc" },
    select: {
      senderId: true,
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
  const sentCounts = buildCanonicalSentCountsBySender(sentConfessions);

  return (
    <UsersManagementPanel
      title="Users Management"
      users={users.map((user) => ({
        ...user,
        sentCount: sentCounts.get(user.id) ?? 0,
      }))}
      phoneQuery={phoneQuery}
    />
  );
}
