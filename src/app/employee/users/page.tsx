import { StaffPermission } from "@prisma/client";
import UsersManagementPanel from "@/components/UsersManagementPanel";
import { prisma } from "@/lib/prisma";
import { requireStaffPermission } from "@/lib/staff-guards";

export default async function EmployeeUsersPage() {
  await requireStaffPermission(StaffPermission.MANAGE_USERS);

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
