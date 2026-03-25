"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Heart, Send, Search, User, LogOut, Inbox, Menu, X } from "lucide-react";
import { toast } from "sonner";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: Heart },
  { href: "/dashboard/confessions", label: "My Confessions", icon: Inbox },
  { href: "/dashboard/send", label: "Send", icon: Send },
  { href: "/dashboard/search", label: "Search", icon: Search },
  { href: "/dashboard/profile", label: "Profile", icon: User },
];

export default function DashboardNav({ user }: { user: { id: string; name: string } }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("Signed out");
    router.push("/");
  }

  const navContent = (
    <>
      <div className="px-3 mb-8">
        <span className="text-xl font-bold gradient-text">iConfess</span>
        <p className="text-xs mt-0.5" style={{ color: "#4a4870" }}>Anonymous Confessions</p>
      </div>

      <div
        className="flex items-center gap-3 px-3 py-3 rounded-xl mb-6"
        style={{ background: "rgba(30,30,63,0.3)" }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #7c3aed, #c084fc)" }}
        >
          {user.name[0].toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: "#f0eeff" }}>{user.name}</p>
          <p className="text-xs" style={{ color: "#4a4870" }}>#{user.id.slice(-6).toUpperCase()}</p>
        </div>
      </div>

      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}>
              <motion.div
                whileHover={{ x: 2 }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all"
                style={{
                  background: active ? "rgba(124,58,237,0.15)" : "transparent",
                  color: active ? "#c084fc" : "#9b98c8",
                  border: active ? "1px solid rgba(192,132,252,0.2)" : "1px solid transparent",
                }}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
                {active && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="ml-auto w-1.5 h-1.5 rounded-full"
                    style={{ background: "#c084fc" }}
                  />
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      <button
        onClick={handleLogout}
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all w-full"
        style={{ color: "#4a4870" }}
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
        style={{ background: "rgba(5,5,15,0.92)", borderBottom: "1px solid #1e1e3f", backdropFilter: "blur(20px)" }}
      >
        <div>
          <span className="text-lg font-bold gradient-text">iConfess</span>
          <p className="text-[11px] mt-0.5" style={{ color: "#4a4870" }}>{user.name}</p>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen((current) => !current)}
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(30,30,63,0.45)", border: "1px solid #1e1e3f", color: "#c084fc" }}
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
        style={{ background: "rgba(5,5,15,0.97)", borderRight: "1px solid #1e1e3f", backdropFilter: "blur(20px)" }}
      >
        {navContent}
      </aside>
    </>
  );
}
