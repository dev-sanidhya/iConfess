import AdminPaymentSettings from "@/components/AdminPaymentSettings";
import { getAppSettings } from "@/lib/app-settings";
import { getPaymentCatalog } from "@/lib/payment-catalog.server";
import { requireAdmin } from "@/lib/staff-guards";

export default async function AdminPaymentSettingsPage() {
  await requireAdmin();

  const [paymentCatalog, appSettings] = await Promise.all([
    getPaymentCatalog(),
    getAppSettings(),
  ]);

  return (
    <div className="space-y-6 py-6">
      <AdminPaymentSettings initialCatalog={paymentCatalog} initialAppSettings={appSettings} />
    </div>
  );
}
