import { redirect } from "next/navigation";
import DashboardBackground from "@/components/DashboardBackground";
import InternalNav from "@/components/InternalNav";
import ActivityTracker from "@/components/ActivityTracker";
import { getStaffSession } from "@/lib/staff-auth";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const staff = await getStaffSession();
  if (!staff) {
    redirect("/staff/login");
  }

  if (staff.role !== "MARKETING_AGENT") {
    redirect(staff.role === "ADMIN" ? "/admin" : "/employee");
  }

  return (
    <>
      <ActivityTracker />
      <div className="flex min-h-screen">
        <DashboardBackground />
        <InternalNav staff={{ name: staff.name, role: staff.role, permissions: staff.permissions }} />
        <main className="relative z-10 w-full max-w-7xl flex-1 px-4 pt-20 pb-8 sm:px-6 md:ml-64 md:px-8 md:pt-0">
          {children}
        </main>
      </div>
    </>
  );
}
