import UsersManagementPanel from "@/components/UsersManagementPanel";
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
          sentConfessions: true,
          receivedConfessions: true,
          payments: true,
        },
      },
    },
    take: 100,
  });

  return <UsersManagementPanel title="Users Queue" users={users} />;
}
