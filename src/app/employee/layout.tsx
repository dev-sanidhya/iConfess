import { redirect } from "next/navigation";
import DashboardBackground from "@/components/DashboardBackground";
import InternalNav from "@/components/InternalNav";
import { getStaffSession } from "@/lib/staff-auth";

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const staff = await getStaffSession();
  if (!staff) {
    redirect("/staff/login");
  }

  if (staff.role !== "EMPLOYEE") {
    redirect(staff.role === "ADMIN" ? "/admin" : "/marketing");
  }

  return (
    <div className="flex min-h-screen">
      <DashboardBackground />
      <InternalNav staff={{ name: staff.name, role: staff.role, permissions: staff.permissions }} />
      <main className="flex-1 md:ml-64 pt-20 md:pt-0 px-4 sm:px-6 md:px-8 pb-8 max-w-7xl relative z-10 w-full">
        {children}
      </main>
    </div>
  );
}
