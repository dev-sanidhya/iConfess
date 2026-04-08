import UsersManagementPanel from "@/components/UsersManagementPanel";
import { buildCanonicalSentCountsBySender } from "@/lib/confessions";
import { prisma } from "@/lib/prisma";
import { requireStaffPermission } from "@/lib/staff-guards";
import { STAFF_PERMISSIONS } from "@/lib/staff-types";

export default async function EmployeeUsersPage() {
  await requireStaffPermission(STAFF_PERMISSIONS[0]);

  const users = await prisma.user.findMany({
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
      title="Users Queue"
      users={users.map((user) => ({
        ...user,
        sentCount: sentCounts.get(user.id) ?? 0,
      }))}
    />
  );
}
