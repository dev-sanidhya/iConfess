import Link from "next/link";
import { StaffPermission } from "@prisma/client";
import { getStaffSession } from "@/lib/staff-auth";

export default async function EmployeeHomePage() {
  const staff = await getStaffSession();
  const links = [
    {
      href: "/employee/users",
      label: "Manage users",
      visible: staff?.permissions.includes(StaffPermission.MANAGE_USERS),
    },
    {
      href: "/employee/payments",
      label: "Manage payments",
      visible: staff?.permissions.includes(StaffPermission.MANAGE_PAYMENTS),
    },
    {
      href: "/employee/confessions",
      label: "Manage confessions",
      visible: staff?.permissions.includes(StaffPermission.MANAGE_CONFESSIONS),
    },
  ].filter((item) => item.visible);

  return (
    <div className="space-y-6 py-6">
      <section className="glass rounded-3xl p-5 sm:p-6">
        <h1 className="text-2xl font-semibold mb-2" style={{ color: "#f0eeff" }}>Employee Workspace</h1>
        <p className="text-sm" style={{ color: "#9b98c8" }}>
          Manage your operations from here.
        </p>
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        {links.map((item) => (
          <Link key={item.href} href={item.href} className="glass rounded-2xl p-5 hover:translate-y-[-1px] transition-transform">
            <p className="text-lg font-medium" style={{ color: "#f0eeff" }}>{item.label}</p>
            <p className="text-sm mt-2" style={{ color: "#9b98c8" }}>Open this module</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
