"use client";

import { motion } from "framer-motion";
import { Compass, Heart, KeyRound, Lock, Mail, Shield, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { maskPhone } from "@/lib/utils";

type Stat = { label: string; value: number | "locked"; icon: React.ElementType; color: string; note: string };

export default function DashboardOverview({
  user,
  stats,
  confessionPageUnlocked,
}: {
  user: { name: string; id: string; phone: string; primaryCategory: string; searchablePlaces: number };
  stats: {
    profileSearchCount: number;
    receivedConfessionCount: number;
    lockedReceivedConfessionCount: number;
    profileInsightUnlockCount: number;
  };
  confessionPageUnlocked: boolean;
}) {
  const statCards: Stat[] = [
    { label: "Profile Searches", value: stats.profileSearchCount, icon: Search, color: "#a78bfa", note: "How many times your profile was searched on iConfess" },
    {
      label: "Received Confessions",
      value: !confessionPageUnlocked && stats.lockedReceivedConfessionCount === 0 ? "locked" : stats.receivedConfessionCount,
      icon: Heart,
      color: "#9f6c31",
      note: !confessionPageUnlocked && stats.lockedReceivedConfessionCount === 0
        ? "Unlock My Confessions page to access received confessions"
        : "Total confessions delivered to your inbox",
    },
    { label: "Profile Insight Unlocks", value: stats.profileInsightUnlockCount, icon: KeyRound, color: "#60a5fa", note: "How many times people paid to unlocked your profile insights" },
    { label: "Searchable Places", value: user.searchablePlaces, icon: Compass, color: "#34d399", note: "Active profile categories linked to you" },
  ];
  const feedbackEmailHref = "mailto:ciarocid01@gmail.com?subject=iConfess%20Feedback%20%26%20Suggestions";

  return (
    <div className="py-2">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-10"
      >
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: "#3f2c1d" }}>
          Hey, {user.name.split(" ")[0]}
        </h1>
        <p className="text-sm mt-1" style={{ color: "#735a43" }}>
          Your profile is searchable through {user.searchablePlaces} field{user.searchablePlaces !== 1 ? "s" : ""}. Keep your details sharp so people can find you accurately.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.5 }}
        className="rounded-2xl p-6 mb-8"
        style={{
          background: "linear-gradient(135deg, rgba(214,185,150,0.24) 0%, rgba(255,255,255,0.5) 100%)",
          border: "1px solid rgba(179,148,111,0.22)",
        }}
      >
        <div className="flex flex-col lg:flex-row items-start justify-between gap-4 lg:gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "#9b7c5d" }}>
              Profile Snapshot
            </p>
            <h2 className="text-xl sm:text-2xl font-semibold mt-2 break-all sm:break-normal" style={{ color: "#3f2c1d" }}>
              {maskPhone(user.phone)}
            </h2>
            <p className="text-sm mt-2 max-w-xl" style={{ color: "#735a43" }}>
              Primary profile: {user.primaryCategory.toLowerCase()}. Your confession inbox is {confessionPageUnlocked ? "unlocked" : "still locked"} and your public identity map is currently spread across {user.searchablePlaces} searchable context{user.searchablePlaces !== 1 ? "s" : ""}.
            </p>
          </div>
          <div
            className="rounded-2xl px-4 py-3 w-full lg:w-auto lg:min-w-[180px]"
            style={{ background: "rgba(255,251,245,0.72)", border: "1px solid rgba(179,148,111,0.22)" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4" style={{ color: confessionPageUnlocked ? "#3f9a76" : "#8f6a46" }} />
              <span className="text-sm font-medium" style={{ color: "#3f2c1d" }}>
                Inbox Access
              </span>
            </div>
            <p className="text-xs" style={{ color: "#735a43" }}>
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
              <span className="text-xs" style={{ color: "#9b7c5d" }}>{stat.label}</span>
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: `${stat.color}15` }}
              >
                <stat.icon className="w-3.5 h-3.5" style={{ color: stat.color }} />
              </div>
            </div>
            {stat.value === "locked" ? (
              <div className="h-9 flex items-center">
                <Lock className="w-8 h-8" style={{ color: "#3f2c1d" }} />
              </div>
            ) : (
              <p className="text-3xl font-bold" style={{ color: "#3f2c1d" }}>{stat.value}</p>
            )}
            <p className="text-xs mt-2 leading-relaxed" style={{ color: "#9b7c5d" }}>{stat.note}</p>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28, duration: 0.5 }}
        className="rounded-2xl p-6"
        style={{
          background: "linear-gradient(135deg, rgba(255,251,245,0.94) 0%, rgba(244,227,205,0.72) 100%)",
          border: "1px solid rgba(179,148,111,0.22)",
        }}
      >
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "#9b7c5d" }}>
              Feedback & Suggestions
            </p>
            <h2 className="text-xl sm:text-2xl font-semibold mt-2" style={{ color: "#3f2c1d" }}>
              Help us improve iConfess
            </h2>
            <p className="text-sm mt-2 leading-relaxed" style={{ color: "#735a43" }}>
              Found something we should improve or have an idea you want to share? Send it to us directly.
            </p>
          </div>
          <Button
            asChild
            className="h-11 rounded-xl px-5 text-sm font-semibold"
            style={{ backgroundColor: "#3f2c1d", color: "#fff8f1" }}
          >
            <a href={feedbackEmailHref}>
              <Mail className="w-4 h-4" />
              Send Feedback
            </a>
          </Button>
        </div>
      </motion.div>
    </div>
  );
}


