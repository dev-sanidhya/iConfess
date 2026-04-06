import StaffLoginCard from "@/components/StaffLoginCard";
import { hasAnyAdmin } from "@/lib/staff-auth";

export const dynamic = "force-dynamic";

export default async function StaffLoginPage() {
  const adminExists = await hasAnyAdmin();

  return <StaffLoginCard hasAdmin={adminExists} />;
}
