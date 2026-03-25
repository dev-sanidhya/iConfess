"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Compass, Heart, Clock, Shield, Sparkles } from "lucide-react";

type Stat = { label: string; value: number; icon: React.ElementType; color: string; note: string };
type RecentItem = {
  id: string;
  status: string;
  location: string;
  createdAt: Date;
  mutualDetected: boolean;
};

const statusColors: Record<string, string> = {
  PENDING: "#94a3b8",
  DELIVERED: "#60a5fa",
  OPENED: "#a78bfa",
  REPLIED: "#34d399",
  GHOSTED: "#f87171",
  EXPIRED: "#6b7280",
};

export default function DashboardOverview({
  user,
  stats,
  recentSent,
  confessionPageUnlocked,
}: {
  user: { name: string; id: string; username: string | null; primaryCategory: string; searchablePlaces: number };
  stats: { sentCount: number; mutualCount: number; pendingCount: number };
  recentSent: RecentItem[];
  confessionPageUnlocked: boolean;
}) {
  const statCards: Stat[] = [
    { label: "Confessions Sent", value: stats.sentCount, icon: Sparkles, color: "#a78bfa", note: "Total messages you have sent" },
    { label: "Mutuals", value: stats.mutualCount, icon: Heart, color: "#f472b6", note: "Two-way confession matches" },
    { label: "Pending", value: stats.pendingCount, icon: Clock, color: "#60a5fa", note: "Still waiting to be opened or matched" },
    { label: "Searchable Places", value: user.searchablePlaces, icon: Compass, color: "#34d399", note: "Active profile categories linked to you" },
  ];

  return (
    <div className="py-2">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-10"
      >
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: "#f0eeff" }}>
          Hey, {user.name.split(" ")[0]}
        </h1>
        <p className="text-sm mt-1" style={{ color: "#9b98c8" }}>
          Your profile is live through {user.searchablePlaces} place{user.searchablePlaces !== 1 ? "s" : ""}. Keep your details sharp so people can find you accurately.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.5 }}
        className="rounded-2xl p-6 mb-8"
        style={{
          background: "linear-gradient(135deg, rgba(124,58,237,0.16) 0%, rgba(14,165,233,0.08) 100%)",
          border: "1px solid rgba(192,132,252,0.2)",
        }}
      >
        <div className="flex flex-col lg:flex-row items-start justify-between gap-4 lg:gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "#9b98c8" }}>
              Profile Snapshot
            </p>
            <h2 className="text-xl sm:text-2xl font-semibold mt-2 break-all sm:break-normal" style={{ color: "#f0eeff" }}>
              @{user.username ?? "profile-incomplete"}
            </h2>
            <p className="text-sm mt-2 max-w-xl" style={{ color: "#c7c3ee" }}>
              Primary profile: {user.primaryCategory.toLowerCase()}. Your confession inbox is {confessionPageUnlocked ? "unlocked" : "still locked"} and your public identity map is currently spread across {user.searchablePlaces} searchable context{user.searchablePlaces !== 1 ? "s" : ""}.
            </p>
          </div>
          <div
            className="rounded-2xl px-4 py-3 w-full lg:w-auto lg:min-w-[180px]"
            style={{ background: "rgba(10,10,24,0.35)", border: "1px solid rgba(192,132,252,0.14)" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4" style={{ color: confessionPageUnlocked ? "#34d399" : "#c084fc" }} />
              <span className="text-sm font-medium" style={{ color: "#f0eeff" }}>
                Inbox Access
              </span>
            </div>
            <p className="text-xs" style={{ color: "#9b98c8" }}>
              {confessionPageUnlocked
                ? "Received confessions can be opened from the inbox."
                : "Received confessions stay locked until the inbox is unlocked."}
            </p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-10">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07, duration: 0.5 }}
            className="glass glass-hover rounded-2xl p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs" style={{ color: "#4a4870" }}>{stat.label}</span>
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: `${stat.color}15` }}
              >
                <stat.icon className="w-3.5 h-3.5" style={{ color: stat.color }} />
              </div>
            </div>
            <p className="text-3xl font-bold" style={{ color: "#f0eeff" }}>{stat.value}</p>
            <p className="text-xs mt-2 leading-relaxed" style={{ color: "#6f6b98" }}>{stat.note}</p>
          </motion.div>
        ))}
      </div>

      {recentSent.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.48, duration: 0.5 }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-4">
            <h2 className="font-semibold" style={{ color: "#f0eeff" }}>Recent Sending Activity</h2>
            <p className="text-xs" style={{ color: "#6f6b98" }}>Latest outgoing confessions</p>
          </div>
          <div className="flex flex-col gap-3">
            {recentSent.map((c) => (
              <div key={c.id} className="glass rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-2 h-2 rounded-full" style={{ background: statusColors[c.status] || "#9b98c8" }} />
                  <div className="min-w-0">
                    <p className="text-sm" style={{ color: "#f0eeff" }}>
                      {c.location.charAt(0) + c.location.slice(1).toLowerCase()} Confession
                    </p>
                    <p className="text-xs" style={{ color: "#4a4870" }}>
                      {new Date(c.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {c.mutualDetected && (
                    <span className="text-xs px-2 py-0.5 rounded-full status-mutual">Mutual</span>
                  )}
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full status-${c.status.toLowerCase()}`}
                  >
                    {c.status.charAt(0) + c.status.slice(1).toLowerCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
