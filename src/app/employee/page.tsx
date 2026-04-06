import Link from "next/link";
import { getStaffSession } from "@/lib/staff-auth";
import { STAFF_PERMISSIONS } from "@/lib/staff-types";

export default async function EmployeeHomePage() {
  const staff = await getStaffSession();
  const links = [
    {
      href: "/employee/users",
      label: "Manage users",
      visible: staff?.permissions.includes(STAFF_PERMISSIONS[0]),
    },
    {
      href: "/employee/payments",
      label: "Manage payments",
      visible: staff?.permissions.includes(STAFF_PERMISSIONS[1]),
    },
    {
      href: "/employee/confessions",
      label: "Manage confessions",
      visible: staff?.permissions.includes(STAFF_PERMISSIONS[2]),
    },
  ].filter((item) => item.visible);

  return (
    <div className="space-y-6 py-6">
      <section className="glass rounded-3xl p-5 sm:p-6">
        <h1 className="text-2xl font-semibold mb-2" style={{ color: "#3f2c1d" }}>Employee Workspace</h1>
        <p className="text-sm" style={{ color: "#735a43" }}>
          Manage your operations from here.
        </p>
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        {links.map((item) => (
          <Link key={item.href} href={item.href} className="glass rounded-2xl p-5 hover:translate-y-[-1px] transition-transform">
            <p className="text-lg font-medium" style={{ color: "#3f2c1d" }}>{item.label}</p>
            <p className="text-sm mt-2" style={{ color: "#8c7257" }}>Open this module</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
