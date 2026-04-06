import PaymentsManagementPanel from "@/components/PaymentsManagementPanel";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/staff-guards";

export default async function AdminPaymentsPage() {
  await requireAdmin();

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

  return <PaymentsManagementPanel title="Payments Management" payments={payments} />;
}
