import { StaffPermission } from "@prisma/client";
import ConfessionsManagementPanel from "@/components/ConfessionsManagementPanel";
import { prisma } from "@/lib/prisma";
import { requireStaffPermission } from "@/lib/staff-guards";

export default async function EmployeeConfessionsPage() {
  await requireStaffPermission(StaffPermission.MANAGE_CONFESSIONS);

  const confessions = await prisma.confession.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      sender: {
        select: {
          name: true,
          phone: true,
        },
      },
      target: {
        select: {
          name: true,
          phone: true,
        },
      },
    },
    take: 100,
  });

  return <ConfessionsManagementPanel title="Confessions Queue" confessions={confessions} />;
}
