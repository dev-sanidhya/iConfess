"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, User, Heart, ArrowRight, Phone, AtSign } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { locationCategories, locationFields, type LocationCategory } from "@/lib/matching";

type SearchMode = "profile" | "phone" | "social";

type SearchResult = {
  id: string;
  name: string;
  username: string | null;
  instagramHandle: string | null;
  snapchatHandle: string | null;
  primaryCategory: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  matchContext: string[];
  confessionCount: number;
  hasUnlockedInsights: boolean;
  college: string | null;
  school: string | null;
  workplace: string | null;
  gym: string | null;
  neighbourhood: string | null;
};

type ProfileInsight = {
  id: string;
  message: string;
  location: string;
  createdAt: string;
  sender: {
    firstName: string;
    gender: "MALE" | "FEMALE" | "OTHER";
    primaryCategory: string;
  };
};

export default function SearchPage() {
  const [mode, setMode] = useState<SearchMode>("profile");
  const [phone, setPhone] = useState("");
  const [platform, setPlatform] = useState<"instagram" | "snapchat">("instagram");
  const [handle, setHandle] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<LocationCategory | null>(null);
  const [profileDetails, setProfileDetails] = useState<Record<string, string>>({});
  const [results, setResults] = useState<SearchResult[]>([]);
  const [insightsByUser, setInsightsByUser] = useState<Record<string, ProfileInsight[]>>({});
  const [loadingInsightsFor, setLoadingInsightsFor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function runSearch() {
    const params = new URLSearchParams();

    if (mode === "phone") {
      if (phone.length !== 10) return;
      params.set("mode", "phone");
      params.set("phone", phone);
    }

    if (mode === "social") {
      if (!handle.trim()) return;
      params.set("mode", "social");
      params.set("platform", platform);
      params.set("handle", handle.trim());
    }

    if (mode === "profile") {
      if (!selectedCategory) return;
      params.set("mode", "profile");
      params.set("location", selectedCategory);
      for (const [key, value] of Object.entries(profileDetails)) {
        if (value.trim()) params.set(key, value.trim());
      }
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/users/search?${params.toString()}`);
      const data = await res.json();
      setResults(data.results || []);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }

  async function loadInsights(targetUserId: string, alreadyUnlocked: boolean) {
    setLoadingInsightsFor(targetUserId);
    try {
      if (!alreadyUnlocked) {
        const unlockRes = await fetch("/api/payments/unlock-profile-insights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetUserId }),
        });
        const unlockData = await unlockRes.json();
        if (!unlockRes.ok) throw new Error(unlockData.error);
        setResults((current) => current.map((result) => (
          result.id === targetUserId ? { ...result, hasUnlockedInsights: true } : result
        )));
      }

      const res = await fetch(`/api/users/search/insights?targetUserId=${targetUserId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setInsightsByUser((current) => ({ ...current, [targetUserId]: data.insights ?? [] }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load insights";
      throw new Error(message);
    } finally {
      setLoadingInsightsFor(null);
    }
  }

  return (
    <div className="py-2 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold" style={{ color: "#f0eeff" }}>Search</h1>
        <p className="text-sm mt-1" style={{ color: "#9b98c8" }}>
          Search by phone, profile details, or social handle.
        </p>
      </div>

      <div
        className="flex gap-1 p-1 rounded-xl mb-6 w-fit"
        style={{ background: "rgba(30,30,63,0.4)", border: "1px solid #1e1e3f" }}
      >
        {(["profile", "phone", "social"] as SearchMode[]).map((entryMode) => (
          <button
            key={entryMode}
            onClick={() => {
              setMode(entryMode);
              setResults([]);
              setSearched(false);
            }}
            className="px-5 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: mode === entryMode ? "rgba(124,58,237,0.3)" : "transparent",
              color: mode === entryMode ? "#c084fc" : "#9b98c8",
              border: mode === entryMode ? "1px solid rgba(192,132,252,0.3)" : "1px solid transparent",
            }}
          >
            {entryMode === "profile"
              ? "By details"
              : entryMode === "phone"
                ? "By phone"
                : "By social"}
          </button>
        ))}
      </div>

      <div className="glass rounded-2xl p-5 mb-8 flex flex-col gap-4">
        <AnimatePresence mode="wait">
          {mode === "phone" && (
            <motion.div key="phone" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h3 className="text-sm font-medium mb-3" style={{ color: "#9b98c8" }}>Search by phone number</h3>
              <div className="flex gap-2">
                <span
                  className="flex items-center px-3 rounded-xl text-sm border"
                  style={{ background: "rgba(30,30,63,0.5)", borderColor: "#1e1e3f", color: "#9b98c8" }}
                >
                  +91
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm border"
                  style={{ background: "rgba(30,30,63,0.5)", borderColor: "#1e1e3f", color: "#f0eeff" }}
                />
              </div>
            </motion.div>
          )}

          {mode === "social" && (
            <motion.div key="social" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h3 className="text-sm font-medium mb-3" style={{ color: "#9b98c8" }}>Search by social handle</h3>
              <div className="flex gap-2 mb-3">
                {(["instagram", "snapchat"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPlatform(value)}
                    className="px-4 py-2 rounded-lg text-sm"
                    style={{
                      background: platform === value ? "rgba(124,58,237,0.3)" : "rgba(30,30,63,0.3)",
                      color: platform === value ? "#c084fc" : "#9b98c8",
                      border: `1px solid ${platform === value ? "rgba(192,132,252,0.3)" : "#1e1e3f"}`,
                    }}
                  >
                    {value === "instagram" ? "Instagram" : "Snapchat"}
                  </button>
                ))}
              </div>
              <div className="relative">
                <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#9b98c8" }} />
                <input
                  type="text"
                  placeholder={platform === "instagram" ? "instagram_handle" : "snapchat_handle"}
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border"
                  style={{ background: "rgba(30,30,63,0.5)", borderColor: "#1e1e3f", color: "#f0eeff" }}
                />
              </div>
            </motion.div>
          )}

          {mode === "profile" && (
            <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h3 className="text-sm font-medium mb-3" style={{ color: "#9b98c8" }}>Search by profile details</h3>
              <div className="grid grid-cols-1 gap-2 mb-4">
                {locationCategories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setProfileDetails({});
                    }}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-left transition-all"
                    style={{
                      background: selectedCategory === cat.id ? "rgba(124,58,237,0.15)" : "rgba(30,30,63,0.3)",
                      border: `1px solid ${selectedCategory === cat.id ? "rgba(192,132,252,0.4)" : "#1e1e3f"}`,
                      color: selectedCategory === cat.id ? "#c084fc" : "#9b98c8",
                    }}
                  >
                    <span>{cat.emoji}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>

              {selectedCategory && (
                <div className="flex flex-col gap-3">
                  <p className="text-xs" style={{ color: "#4a4870" }}>
                    Only fill the details you know. Leave the rest blank.
                  </p>
                  {locationFields[selectedCategory].map((field) => (
                    <div key={field.key}>
                      <label className="text-xs font-medium mb-1 block" style={{ color: "#9b98c8" }}>
                        {field.label}
                      </label>
                      {field.options ? (
                        <select
                          value={profileDetails[field.key] || ""}
                          onChange={(e) =>
                            setProfileDetails((current) => ({ ...current, [field.key]: e.target.value }))
                          }
                          className="w-full px-4 py-2.5 rounded-xl text-sm border"
                          style={{ background: "rgba(30,30,63,0.5)", borderColor: "#1e1e3f", color: "#f0eeff" }}
                        >
                          <option value="">Select…</option>
                          {field.options.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={field.type || "text"}
                          value={profileDetails[field.key] || ""}
                          onChange={(e) =>
                            setProfileDetails((current) => ({ ...current, [field.key]: e.target.value }))
                          }
                          className="w-full px-4 py-2.5 rounded-xl text-sm border"
                          style={{ background: "rgba(30,30,63,0.5)", borderColor: "#1e1e3f", color: "#f0eeff" }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="button"
          onClick={runSearch}
          disabled={loading}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-all"
          style={{ background: "linear-gradient(135deg, #7c3aed 0%, #c084fc 100%)" }}
        >
          {mode === "phone" ? <Phone className="w-4 h-4" /> : <Search className="w-4 h-4" />}
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {searched && results.length === 0 && (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-16"
          >
            <User className="w-8 h-8 mx-auto mb-3" style={{ color: "#1e1e3f" }} />
            <p style={{ color: "#4a4870" }}>No matching profile found.</p>
          </motion.div>
        )}

        {results.length > 0 && (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-3"
          >
            {results.map((result, i) => (
              <motion.div
                key={result.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass glass-hover rounded-2xl p-5 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #7c3aed, #c084fc)" }}
                  >
                    {result.name[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium" style={{ color: "#f0eeff" }}>{result.name}</p>
                    <div className="flex flex-col gap-1 mt-1">
                      {result.matchContext.length > 0 ? (
                        result.matchContext.map((contextItem) => (
                          <p key={contextItem} className="text-xs" style={{ color: "#4a4870" }}>
                            {contextItem}
                          </p>
                        ))
                      ) : (
                        <p className="text-xs" style={{ color: "#4a4870" }}>iConfess user</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <Heart className="w-3 h-3" style={{ color: "#f472b6" }} />
                      <span className="text-xs" style={{ color: "#9b98c8" }}>
                        {result.confessionCount} confession{result.confessionCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {result.confessionCount > 0 && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await loadInsights(result.id, result.hasUnlockedInsights);
                        } catch (error) {
                          const message = error instanceof Error ? error.message : "Failed to load insights";
                          toast.error(message);
                        }
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-medium"
                      style={{
                        background: "rgba(244,114,182,0.12)",
                        border: "1px solid rgba(244,114,182,0.18)",
                        color: "#f472b6",
                      }}
                    >
                      {loadingInsightsFor === result.id
                        ? "Loading..."
                        : result.hasUnlockedInsights
                          ? "View insights"
                          : "View confessions (₹X)"}
                    </button>
                  )}
                  <Link
                    href={`/dashboard/send?target=${result.id}&name=${encodeURIComponent(result.name)}`}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-white flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #7c3aed, #c084fc)" }}
                  >
                    Confess
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </motion.div>
            ))}
            {results.map((result) => {
              const insights = insightsByUser[result.id];
              if (!insights) return null;

              return (
                <div
                  key={`${result.id}-insights`}
                  className="glass rounded-2xl p-5 -mt-1"
                >
                  <h3 className="text-sm font-semibold mb-3" style={{ color: "#f0eeff" }}>
                    Confession insights for {result.name}
                  </h3>
                  {insights.length === 0 ? (
                    <p className="text-xs" style={{ color: "#9b98c8" }}>
                      No received confessions available to preview.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {insights.map((insight) => (
                        <div
                          key={insight.id}
                          className="rounded-xl p-4"
                          style={{ background: "rgba(30,30,63,0.28)", border: "1px solid #1e1e3f" }}
                        >
                          <p className="text-sm mb-2" style={{ color: "#f0eeff" }}>
                            &quot;{insight.message}&quot;
                          </p>
                          <p className="text-xs" style={{ color: "#9b98c8" }}>
                            {insight.sender.firstName} • {insight.sender.gender.toLowerCase()} • {insight.sender.primaryCategory.toLowerCase()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
