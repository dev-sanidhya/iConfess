"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { AtSign, BarChart3, Bell, CreditCard, LogOut, Menu, MessageSquare, Settings2, Shield, Users, X } from "lucide-react";
import { STAFF_PERMISSIONS, type StaffPermission, type StaffRole } from "@/lib/staff-types";

type InternalNavProps = {
  staff: {
    name: string;
    role: StaffRole;
    permissions: StaffPermission[];
  };
};

export default function InternalNav({ staff }: InternalNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = staff.role === "ADMIN"
    ? [
        { href: "/admin", label: "Analytics", icon: BarChart3 },
        { href: "/admin/team", label: "Staff Access", icon: Shield },
        { href: "/admin/users", label: "Users", icon: Users },
        { href: "/admin/notifications", label: "Notifications", icon: Bell },
        { href: "/admin/social-handles", label: "Social Ownership", icon: AtSign },
        { href: "/admin/payment-settings", label: "Payment Settings", icon: Settings2 },
        { href: "/admin/payments", label: "Payments Management", icon: CreditCard },
        { href: "/admin/confessions", label: "Confessions", icon: MessageSquare },
      ]
    : [
        ...(staff.permissions.includes(STAFF_PERMISSIONS[0])
          ? [
              { href: "/employee/users", label: "Users", icon: Users },
              { href: "/employee/social-handles", label: "Social Ownership", icon: AtSign },
            ]
          : []),
        ...(staff.permissions.includes(STAFF_PERMISSIONS[1])
          ? [{ href: "/employee/payments", label: "Payments", icon: CreditCard }]
          : []),
        ...(staff.permissions.includes(STAFF_PERMISSIONS[2])
          ? [{ href: "/employee/confessions", label: "Confessions", icon: MessageSquare }]
          : []),
      ];

  async function handleLogout() {
    await fetch("/api/internal/logout", { method: "POST" });
    router.push("/staff/login");
  }

  const navContent = (
    <>
      <div className="px-3 mb-8">
        <span className="text-xl font-bold gradient-text">iConfess Internal</span>
        <p className="text-xs mt-1" style={{ color: "#9b7c5d" }}>
          {staff.role === "ADMIN" ? "Admin panel" : "Employee panel"}
        </p>
      </div>

      <div
        className="flex items-center gap-3 px-3 py-3 rounded-xl mb-6"
        style={{ background: "rgba(255,251,245,0.88)", border: "1px solid rgba(184,159,126,0.22)" }}
      >
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white"
          style={{ background: "linear-gradient(135deg, #8f6a46, #d7b892)" }}
        >
          {staff.name[0]?.toUpperCase() ?? "I"}
        </div>
        <div>
          <p className="text-sm font-medium" style={{ color: "#3f2c1d" }}>{staff.name}</p>
          <p className="text-xs" style={{ color: "#9b7c5d" }}>{staff.role}</p>
        </div>
      </div>

      <nav className="flex flex-col gap-1 flex-1">
        {links.map((item) => {
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}>
              <div
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all"
                style={{
                  background: active ? "rgba(143,106,70,0.12)" : "transparent",
                  color: active ? "#8f6a46" : "#8c7257",
                  border: active ? "1px solid rgba(179,148,111,0.24)" : "1px solid transparent",
                }}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={handleLogout}
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all w-full"
        style={{ color: "#8c7257" }}
      >
        <LogOut className="w-4 h-4" />
        Sign Out
      </button>
    </>
  );

  return (
    <>
      <div
        className="md:hidden fixed top-0 inset-x-0 z-40 px-4 py-3 flex items-center justify-between"
        style={{ background: "rgba(247,239,228,0.94)", borderBottom: "1px solid rgba(184,159,126,0.24)", backdropFilter: "blur(20px)" }}
      >
        <div>
          <span className="text-lg font-bold gradient-text">iConfess Internal</span>
          <p className="text-[11px] mt-0.5" style={{ color: "#9b7c5d" }}>{staff.role}</p>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen((current) => !current)}
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(255,251,245,0.9)", border: "1px solid rgba(184,159,126,0.24)", color: "#8f6a46" }}
          aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation overlay"
          onClick={() => setMobileOpen(false)}
          className="md:hidden fixed inset-0 z-40 bg-black/55"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 h-screen w-[min(82vw,20rem)] md:w-64 flex flex-col py-6 md:py-8 px-4 transition-transform duration-300 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
        style={{ background: "rgba(247,239,228,0.97)", borderRight: "1px solid rgba(184,159,126,0.24)", backdropFilter: "blur(20px)" }}
      >
        {navContent}
      </aside>
    </>
  );
}
