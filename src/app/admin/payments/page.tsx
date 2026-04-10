import AdminPaymentSettings from "@/components/AdminPaymentSettings";
import PaymentsManagementPanel from "@/components/PaymentsManagementPanel";
import { getPaymentCatalog } from "@/lib/payment-catalog.server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/staff-guards";

export default async function AdminPaymentsPage() {
  await requireAdmin();

  const paymentCatalog = await getPaymentCatalog();

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

  return (
    <div className="space-y-6 py-6">
      <AdminPaymentSettings initialCatalog={paymentCatalog} />
      <PaymentsManagementPanel title="Payments Management" payments={payments} />
    </div>
  );
}
