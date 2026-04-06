import { StaffPermission } from "@prisma/client";
import PaymentsManagementPanel from "@/components/PaymentsManagementPanel";
import { prisma } from "@/lib/prisma";
import { requireStaffPermission } from "@/lib/staff-guards";

export default async function EmployeePaymentsPage() {
  await requireStaffPermission(StaffPermission.MANAGE_PAYMENTS);

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
