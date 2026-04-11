import AdminNotificationsPanel from "@/components/AdminNotificationsPanel";
import { getNotificationAudienceRows, NOTIFICATION_AUDIENCE_CATEGORY } from "@/lib/internal-notifications";
import { requireAdmin } from "@/lib/staff-guards";

export default async function AdminNotificationsPage() {
  await requireAdmin();

  const category = NOTIFICATION_AUDIENCE_CATEGORY.UNREGISTERED_PHONE_SEARCH;
  const rows = await getNotificationAudienceRows(category);

  return <AdminNotificationsPanel initialCategory={category} initialRows={rows} />;
}
