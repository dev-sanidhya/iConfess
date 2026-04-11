import AdminPaymentSettings from "@/components/AdminPaymentSettings";
import { getPaymentCatalog } from "@/lib/payment-catalog.server";
import { requireAdmin } from "@/lib/staff-guards";

export default async function AdminPaymentSettingsPage() {
  await requireAdmin();

  const paymentCatalog = await getPaymentCatalog();

  return (
    <div className="space-y-6 py-6">
      <AdminPaymentSettings initialCatalog={paymentCatalog} />
    </div>
  );
}
