import PaymentsManagementPanel from "@/components/PaymentsManagementPanel";
import { prisma } from "@/lib/prisma";
import { requireStaffPermission } from "@/lib/staff-guards";
import { STAFF_PERMISSIONS } from "@/lib/staff-types";

export default async function EmployeePaymentsPage() {
  await requireStaffPermission(STAFF_PERMISSIONS[1]);

  const payments = await prisma.payment.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          name: true,
          phone: true,
        },
      },
    },
    take: 100,
  });

  return <PaymentsManagementPanel title="Payments Queue" payments={payments} />;
}
