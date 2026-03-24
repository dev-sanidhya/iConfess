"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Send, Inbox, Heart, Clock, ArrowRight, Lock } from "lucide-react";

type Stat = { label: string; value: number; icon: React.ElementType; color: string };
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
  user: { name: string; id: string };
  stats: { sentCount: number; receivedCount: number; mutualCount: number; pendingCount: number };
  recentSent: RecentItem[];
  confessionPageUnlocked: boolean;
}) {
  const statCards: Stat[] = [
    { label: "Confessions Sent", value: stats.sentCount, icon: Send, color: "#a78bfa" },
    { label: "Received", value: stats.receivedCount, icon: Inbox, color: "#f472b6" },
    { label: "Mutual", value: stats.mutualCount, icon: Heart, color: "#f472b6" },
    { label: "Pending", value: stats.pendingCount, icon: Clock, color: "#60a5fa" },
  ];

  return (
    <div className="py-2">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-10"
      >
        <h1 className="text-3xl font-bold" style={{ color: "#f0eeff" }}>
          Hey, {user.name.split(" ")[0]} 👋
        </h1>
        <p className="text-sm mt-1" style={{ color: "#9b98c8" }}>
          Here&apos;s what&apos;s happening with your confessions.
        </p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
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
          </motion.div>
        ))}
      </div>

      {/* Confession page unlock CTA */}
      {!confessionPageUnlocked && stats.receivedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="rounded-2xl p-6 mb-10 flex items-center justify-between"
          style={{
            background: "linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(244,114,182,0.1) 100%)",
            border: "1px solid rgba(192,132,252,0.2)",
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(124,58,237,0.2)" }}
            >
              <Lock className="w-5 h-5" style={{ color: "#c084fc" }} />
            </div>
            <div>
              <p className="font-semibold" style={{ color: "#f0eeff" }}>
                You have {stats.receivedCount} confession{stats.receivedCount > 1 ? "s" : ""} waiting
              </p>
              <p className="text-sm" style={{ color: "#9b98c8" }}>
                Unlock your confession page to read them.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/confessions"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #7c3aed, #c084fc)" }}
          >
            Unlock <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      )}

      {/* Quick actions */}
      <div className="grid md:grid-cols-2 gap-5 mb-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
        >
          <Link href="/dashboard/send">
            <div className="glass glass-hover rounded-2xl p-6 cursor-pointer group">
              <div className="flex items-center justify-between mb-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.2)" }}
                >
                  <Send className="w-5 h-5" style={{ color: "#c084fc" }} />
                </div>
                <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "#c084fc" }} />
              </div>
              <h3 className="font-semibold mb-1" style={{ color: "#f0eeff" }}>Send a Confession</h3>
              <p className="text-sm" style={{ color: "#9b98c8" }}>
                Tell someone how you feel. Completely anonymous.
              </p>
            </div>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.42, duration: 0.5 }}
        >
          <Link href="/dashboard/confessions">
            <div className="glass glass-hover rounded-2xl p-6 cursor-pointer group">
              <div className="flex items-center justify-between mb-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(244,114,182,0.1)", border: "1px solid rgba(244,114,182,0.2)" }}
                >
                  <Inbox className="w-5 h-5" style={{ color: "#f472b6" }} />
                </div>
                <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "#f472b6" }} />
              </div>
              <h3 className="font-semibold mb-1" style={{ color: "#f0eeff" }}>My Confessions</h3>
              <p className="text-sm" style={{ color: "#9b98c8" }}>
                {confessionPageUnlocked
                  ? "Read confessions sent to you."
                  : "Unlock to read confessions sent to you."}
              </p>
            </div>
          </Link>
        </motion.div>
      </div>

      {/* Recent sent */}
      {recentSent.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.48, duration: 0.5 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold" style={{ color: "#f0eeff" }}>Recently Sent</h2>
            <Link href="/dashboard/send" className="text-xs gradient-text">View all →</Link>
          </div>
          <div className="flex flex-col gap-3">
            {recentSent.map((c) => (
              <div key={c.id} className="glass rounded-xl px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full" style={{ background: statusColors[c.status] || "#9b98c8" }} />
                  <div>
                    <p className="text-sm" style={{ color: "#f0eeff" }}>
                      {c.location.charAt(0) + c.location.slice(1).toLowerCase()} Confession
                    </p>
                    <p className="text-xs" style={{ color: "#4a4870" }}>
                      {new Date(c.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
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
