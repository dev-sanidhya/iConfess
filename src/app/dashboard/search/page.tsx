"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, User, Heart, ArrowRight, Phone, AtSign, Lock } from "lucide-react";
import Link from "next/link";
import ManualPaymentDialog from "@/components/ManualPaymentDialog";
import { toast } from "sonner";
import PhoneNumberField from "@/components/PhoneNumberField";
import {
  locationCategories,
  locationFields,
  type LocationCategory,
  type SearchResultProfileSection,
} from "@/lib/matching";
import { formatInr } from "@/lib/pricing";
import { usePaymentCatalog } from "@/lib/use-payment-catalog";
import { getErrorMessage, getResponseErrorMessage } from "@/lib/utils";

type SearchMode = "profile" | "phone" | "social";

type SearchResult = {
  id: string;
  name: string;
  instagramHandle: string | null;
  snapchatHandle: string | null;
  primaryCategory: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  matchContext: string[];
  isCurrentUser: boolean;
  confessionPageUnlocked: boolean;
  confessionCount: number;
  hasUnlockedInsights: boolean;
  unlockedInsightCount: number;
  lockedInsightCount: number;
  profileSections: SearchResultProfileSection[];
  college: string | null;
  school: string | null;
  workplace: string | null;
  gym: string | null;
  neighbourhood: string | null;
  isShadow: boolean;
};

type ProfileInsight = {
  id: string;
  isUnlocked: boolean;
  sender: {
    category: string;
    details: Array<{
      label: string;
      value: string;
    }>;
  };
};

type SearchDetailField = {
  key: string;
  label: string;
  type?: string;
  options?: string[];
  required?: boolean;
};

const searchDetailFields: Record<LocationCategory, SearchDetailField[]> = {
  COLLEGE: [
    { key: "collegeName", label: "College Name (e.g. VIPS)", required: true },
    { key: "pinCode", label: "College Pin Code" },
    { key: "course", label: "Course", options: locationFields.COLLEGE.find((field) => field.key === "course")?.options ?? [] },
    { key: "yearOfPassing", label: "Year of Passing (Graduation Year)", type: "number" },
    { key: "branch", label: "Branch (e.g. CSE)" },
    { key: "section", label: "Section" },
    { key: "firstName", label: "First Name", required: true },
    { key: "lastName", label: "Last Name" },
  ],
  SCHOOL: [
    { key: "schoolName", label: "School Name (e.g. KIS)", required: true },
    { key: "pinCode", label: "School Pin Code", required: true },
    { key: "board", label: "Board", options: locationFields.SCHOOL.find((field) => field.key === "board")?.options ?? [] },
    { key: "yearOfCompletion", label: "School graduation year (completed or expected)", type: "number" },
    { key: "section", label: "Section" },
    { key: "firstName", label: "First Name", required: true },
    { key: "lastName", label: "Last Name" },
  ],
  WORKPLACE: [
    { key: "companyName", label: "Company Name", required: true },
    { key: "city", label: "City", required: true },
    { key: "department", label: "Department" },
    { key: "firstName", label: "First Name", required: true },
    { key: "lastName", label: "Last Name" },
  ],
  GYM: [
    { key: "gymName", label: "Gym Name", required: true },
    { key: "pinCode", label: "Gym Pin Code", required: true },
    { key: "timing", label: "Timing", options: locationFields.GYM.find((field) => field.key === "timing")?.options ?? [] },
    { key: "firstName", label: "First Name", required: true },
    { key: "lastName", label: "Last Name" },
  ],
  NEIGHBOURHOOD: [
    { key: "state", label: "State", options: locationFields.NEIGHBOURHOOD.find((field) => field.key === "state")?.options ?? [], required: true },
    { key: "city", label: "City", required: true },
    { key: "pinCode", label: "Pin Code", required: true },
    { key: "homeNumber", label: "House Number" },
    { key: "premisesName", label: "Society / Premises Name" },
    { key: "firstName", label: "First Name", required: true },
    { key: "lastName", label: "Last Name" },
  ],
};

function getConciseCategorySummary(section: SearchResultProfileSection) {
  const detailMap = Object.fromEntries(section.details.map((detail) => [detail.label, detail.value]));

  if (section.key === "COLLEGE") {
    return [
      detailMap["Branch"],
      detailMap["Section"],
      detailMap["Year of Passing"],
      detailMap["College Name"],
    ].filter(Boolean).join(" · ");
  }

  if (section.key === "SCHOOL") {
    return [
      detailMap["Year of Completion"],
      detailMap["School Name"],
    ].filter(Boolean).join(" · ");
  }

  if (section.key === "WORKPLACE") {
    return [
      detailMap["Company Name"],
      detailMap["City"],
    ].filter(Boolean).join(" · ");
  }

  if (section.key === "GYM") {
    return [
      detailMap["Gym Name"],
      detailMap["Pin Code"],
      detailMap["Timing"],
    ].filter(Boolean).join(" · ");
  }

  return [
    detailMap["Home Number"],
    detailMap["Society / Premises Name"],
    detailMap["City"],
    detailMap["State"],
    detailMap["Pin Code"],
  ].filter(Boolean).join(" · ");
}

export default function SearchPage() {
  const paymentCatalog = usePaymentCatalog();
  const currentPricing = paymentCatalog.pricing;
  const [mode, setMode] = useState<SearchMode>("profile");
  const [phone, setPhone] = useState("");
  const [platform, setPlatform] = useState<"instagram" | "snapchat">("instagram");
  const [handle, setHandle] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<LocationCategory | null>(null);
  const [profileDetails, setProfileDetails] = useState<Record<string, string>>({});
  const [results, setResults] = useState<SearchResult[]>([]);
  const [insightsByUser, setInsightsByUser] = useState<Record<string, ProfileInsight[]>>({});
  const [loadingInsightsFor, setLoadingInsightsFor] = useState<string | null>(null);
  const [pendingInsightUnlock, setPendingInsightUnlock] = useState<SearchResult | null>(null);
  const [showInsightPaymentDialog, setShowInsightPaymentDialog] = useState(false);
  const [viewerSentCount, setViewerSentCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const profileFieldsRef = useRef<HTMLDivElement | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (mode !== "profile" || !selectedCategory) return;

    const node = profileFieldsRef.current;
    if (!node) return;

    requestAnimationFrame(() => {
      const mobileHeader = window.innerWidth < 768
        ? document.querySelector("div.md\\:hidden.fixed.top-0.inset-x-0.z-40")
        : null;
      const headerHeight = mobileHeader instanceof HTMLElement ? mobileHeader.offsetHeight : 0;
      const topPadding = window.innerWidth < 768 ? 12 : 16;
      const targetTop = node.getBoundingClientRect().top + window.scrollY - headerHeight - topPadding;

      window.scrollTo({
        top: Math.max(targetTop, 0),
        behavior: "smooth",
      });
    });
  }, [mode, selectedCategory]);

  useEffect(() => {
    if (!searched || results.length === 0) return;
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [results, searched]);

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
      for (const field of searchDetailFields[selectedCategory]) {
        if (field.required && !profileDetails[field.key]?.trim()) {
          toast.error(`${field.label} is required`);
          return;
        }
      }
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
      setViewerSentCount(data.viewerSentCount ?? 0);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }

  async function loadInsights(targetUserId: string) {
    const target = results.find((result) => result.id === targetUserId) ?? null;
    const query = target?.isShadow
      ? `targetShadowProfileId=${targetUserId}`
      : `targetUserId=${targetUserId}`;

    setLoadingInsightsFor(targetUserId);
    try {
      const res = await fetch(`/api/users/search/insights?${query}`);
      const data = await res.json();
      if (!res.ok) throw new Error(getResponseErrorMessage(data, "Failed to load insights"));
      setInsightsByUser((current) => ({ ...current, [targetUserId]: data.insights ?? [] }));
      setResults((current) => current.map((result) => (
        result.id === targetUserId
          ? {
              ...result,
              hasUnlockedInsights: (data.unlockedInsightCount ?? 0) > 0,
              unlockedInsightCount: data.unlockedInsightCount ?? 0,
              lockedInsightCount: data.lockedInsightCount ?? 0,
            }
          : result
      )));
    } catch (error) {
      throw new Error(getErrorMessage(error, "Failed to load insights"));
    } finally {
      setLoadingInsightsFor(null);
    }
  }

  async function handleInsightAccess(result: SearchResult) {
    if (result.hasUnlockedInsights) {
      try {
        await loadInsights(result.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load insights";
        toast.error(message);
      }
      return;
    }

    setPendingInsightUnlock(result);
  }

  async function confirmInsightUnlock() {
    if (!pendingInsightUnlock) return;

    setShowInsightPaymentDialog(true);
  }

  async function submitInsightPayment(transactionReference: string) {
    if (!pendingInsightUnlock) return;

    try {
      setLoadingInsightsFor(pendingInsightUnlock.id);
      const unlockRes = await fetch("/api/payments/unlock-profile-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(pendingInsightUnlock.isShadow
            ? { targetShadowProfileId: pendingInsightUnlock.id }
            : { targetUserId: pendingInsightUnlock.id }),
          transactionReference,
        }),
      });
      const unlockData = await unlockRes.json();
      if (!unlockRes.ok) throw new Error(getResponseErrorMessage(unlockData, "Failed to submit payment"));
      if (unlockData.alreadyUnlocked) {
        toast.success("Insights are already unlocked for this profile.");
        setShowInsightPaymentDialog(false);
        const targetUserId = pendingInsightUnlock.id;
        setPendingInsightUnlock(null);
        await loadInsights(targetUserId);
        return;
      }

      if (unlockData.alreadyPending) {
        toast.success("Your earlier insight payment request is already pending review.");
        setShowInsightPaymentDialog(false);
        setPendingInsightUnlock(null);
        return;
      }

      toast.success("Payment submitted for review.");
      setShowInsightPaymentDialog(false);
      setPendingInsightUnlock(null);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to submit payment"));
    } finally {
      setLoadingInsightsFor(null);
    }
  }

  return (
    <div className="py-2 max-w-2xl">
      <div className="mb-5">
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: "#3f2c1d" }}>Search</h1>
      </div>

      <div
        className="grid grid-cols-1 sm:grid-cols-3 gap-1 p-1 rounded-xl mb-6 w-full sm:w-fit"
        style={{ background: "rgba(255,248,240,0.9)", border: "1px solid rgba(184,159,126,0.3)" }}
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
              background: mode === entryMode ? "rgba(143,106,70,0.12)" : "transparent",
              color: mode === entryMode ? "#8f6a46" : "#9b7c5d",
              border: mode === entryMode ? "1px solid rgba(179,148,111,0.24)" : "1px solid transparent",
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

      <div className="glass rounded-2xl p-4 sm:p-5 mb-8 flex flex-col gap-4">
        <AnimatePresence mode="wait">
          {mode === "phone" && (
            <motion.div key="phone" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h3 className="text-sm font-medium mb-3" style={{ color: "#8c7257" }}>Search by phone number</h3>
              <PhoneNumberField
                maxLength={10}
                placeholder="9876543210"
                value={phone}
                onChange={setPhone}
                prefixClassName="bg-[rgba(255,251,245,0.92)] border-[rgba(184,159,126,0.35)] text-[#8c7257]"
                inputClassName="bg-[rgba(255,251,245,0.92)] border-[rgba(184,159,126,0.35)] text-[#3f2c1d]"
              />
            </motion.div>
          )}

          {mode === "social" && (
            <motion.div key="social" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h3 className="text-sm font-medium mb-3" style={{ color: "#8c7257" }}>Search by social handle</h3>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {(["instagram", "snapchat"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPlatform(value)}
                    className="px-4 py-2 rounded-lg text-sm"
                    style={{
                      background: platform === value ? "rgba(143,106,70,0.12)" : "rgba(255,251,245,0.84)",
                      color: platform === value ? "#8f6a46" : "#8c7257",
                      border: `1px solid ${platform === value ? "rgba(179,148,111,0.28)" : "rgba(184,159,126,0.22)"}`,
                    }}
                  >
                    {value === "instagram" ? "Instagram" : "Snapchat"}
                  </button>
                ))}
              </div>
              <div className="relative">
                <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#9b7c5d" }} />
                <input
                  type="text"
                  placeholder={platform === "instagram" ? "instagram_handle" : "snapchat_handle"}
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border"
                  style={{ background: "rgba(255,251,245,0.92)", borderColor: "rgba(184,159,126,0.35)", color: "#3f2c1d" }}
                />
              </div>
            </motion.div>
          )}

          {mode === "profile" && (
            <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h3 className="text-sm font-medium mb-3" style={{ color: "#8c7257" }}>Search by profile details</h3>
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
                      background: selectedCategory === cat.id ? "rgba(143,106,70,0.12)" : "rgba(255,251,245,0.84)",
                      border: `1px solid ${selectedCategory === cat.id ? "rgba(179,148,111,0.32)" : "rgba(184,159,126,0.22)"}`,
                      color: selectedCategory === cat.id ? "#8f6a46" : "#8c7257",
                    }}
                  >
                    <span>{cat.emoji}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>

              {selectedCategory && (
                <div ref={profileFieldsRef} className="flex flex-col gap-3">
                  <p className="text-xs" style={{ color: "#9b7c5d" }}>
                    Only fill the details you know. Leave the rest blank.
                  </p>
                  {searchDetailFields[selectedCategory].map((field) => (
                    <div key={field.key}>
                      <label className="text-xs font-medium mb-1 block" style={{ color: "#9b7c5d" }}>
                        {field.label}{field.required ? " *" : ""}
                      </label>
                      {field.options ? (
                        <select
                          value={profileDetails[field.key] || ""}
                          onChange={(e) =>
                            setProfileDetails((current) => ({ ...current, [field.key]: e.target.value }))
                          }
                          className="w-full px-4 py-2.5 rounded-xl text-sm border"
                          style={{ background: "rgba(255,251,245,0.92)", borderColor: "rgba(184,159,126,0.35)", color: "#3f2c1d" }}
                          required={field.required}
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
                          style={{ background: "rgba(255,251,245,0.92)", borderColor: "rgba(184,159,126,0.35)", color: "#3f2c1d" }}
                          required={field.required}
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
          style={{ background: "linear-gradient(135deg, #8f6a46 0%, #d7b892 100%)" }}
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
            <User className="w-8 h-8 mx-auto mb-3" style={{ color: "#8f6a46" }} />
            <p style={{ color: "#735a43" }}>No matching profile found.</p>
          </motion.div>
        )}

        {results.length > 0 && (
          <motion.div
            key="results"
            ref={resultsRef}
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
                className="glass glass-hover rounded-2xl p-4 sm:p-5"
              >
                {(() => {
                  const selectedSection =
                    mode === "profile" && selectedCategory
                      ? result.profileSections.find((section) => section.key === selectedCategory) ?? null
                      : null;
                  const insights = insightsByUser[result.id];
                  const confessPriceLabel = result.isCurrentUser
                    ? formatInr(currentPricing.selfConfession)
                    : viewerSentCount === 0
                      ? "Free"
                      : formatInr(currentPricing.sendConfession);
                  const insightButtonLabel =
                    result.hasUnlockedInsights
                      ? result.lockedInsightCount > 0
                        ? `View insights (${result.lockedInsightCount} new locked)`
                        : "View insights"
                      : `View insights (${formatInr(currentPricing.viewInsights)})`;
                  const shouldHideSelfConfessionCount = result.isCurrentUser && !result.confessionPageUnlocked;

                  return (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div
                        className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                        style={{ background: "linear-gradient(135deg, #8f6a46, #d7b892)" }}
                      >
                        {result.name[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate" style={{ color: "#3f2c1d" }}>{result.name}</p>
                        {selectedSection && (
                          <p className="text-sm mt-1 truncate" style={{ color: "#8c7257" }}>
                            {getConciseCategorySummary(selectedSection)}
                          </p>
                        )}
                        <div className="flex items-center gap-1 mt-1">
                          {shouldHideSelfConfessionCount ? (
                            <>
                              <Lock className="w-3 h-3" style={{ color: "#9b7c5d" }} />
                              <span className="text-xs" style={{ color: "#9b7c5d" }}>
                                Locked
                              </span>
                            </>
                          ) : (
                            <>
                              <Heart className="w-3 h-3" style={{ color: "#9f6c31" }} />
                              <span className="text-xs" style={{ color: "#9b7c5d" }}>
                                {result.confessionCount} confession{result.confessionCount !== 1 ? "s" : ""}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                      {result.confessionCount > 0 && (
                        <button
                          type="button"
                          onClick={() => void handleInsightAccess(result)}
                          disabled={loadingInsightsFor === result.id}
                          className="px-4 py-2 rounded-xl text-xs font-medium w-full sm:w-auto"
                          style={{
                            background: "rgba(198,145,85,0.12)",
                            border: "1px solid rgba(198,145,85,0.18)",
                            color: "#9f6c31",
                          }}
                        >
                          {loadingInsightsFor === result.id
                            ? "Loading..."
                            : insightButtonLabel}
                        </button>
                      )}
                      <Link
                        href={`/dashboard/send?target=${result.id}&name=${encodeURIComponent(result.name)}`}
                        className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-white flex-shrink-0 w-full sm:w-auto"
                        style={{ background: "linear-gradient(135deg, #8f6a46, #d7b892)" }}
                      >
                        {`Confess (${confessPriceLabel})`}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                  {insights && (
                    <div className="rounded-2xl border p-4 sm:p-5" style={{ background: "rgba(255,251,245,0.88)", borderColor: "rgba(184,159,126,0.22)" }}>
                      <h3 className="text-sm font-semibold mb-3" style={{ color: "#3f2c1d" }}>
                        Confession insights for {result.name}
                      </h3>
                      {result.lockedInsightCount > 0 && (
                        <button
                          type="button"
                          onClick={() => setPendingInsightUnlock(result)}
                          disabled={loadingInsightsFor === result.id}
                          className="mb-3 px-4 py-2 rounded-xl text-xs font-medium w-full sm:w-fit"
                          style={{
                            background: "rgba(198,145,85,0.12)",
                            border: "1px solid rgba(198,145,85,0.18)",
                            color: "#9f6c31",
                          }}
                        >
                          {loadingInsightsFor === result.id
                            ? "Loading..."
                            : `Unlock all new insights (${formatInr(currentPricing.viewInsights)})`}
                        </button>
                      )}
                      {insights.length === 0 ? (
                        <p className="text-xs" style={{ color: "#9b7c5d" }}>
                          No received confessions available to preview.
                        </p>
                      ) : (
                        <div className="flex flex-col gap-3">
                          {insights.map((insight) => (
                            <div
                              key={insight.id}
                              className="rounded-xl p-4"
                              style={{
                                background: insight.isUnlocked ? "rgba(255,248,240,0.92)" : "rgba(255,251,245,0.82)",
                                border: insight.isUnlocked ? "1px solid rgba(184,159,126,0.26)" : "1px dashed rgba(198,145,85,0.28)",
                              }}
                            >
                              <p className="text-[11px] uppercase tracking-[0.14em]" style={{ color: "#9b7c5d" }}>
                                {insight.isUnlocked ? "Shared sender field" : "Locked insight"}
                              </p>
                              {insight.isUnlocked ? (
                                <>
                                  <p className="text-sm mt-1 font-medium" style={{ color: "#3f2c1d" }}>
                                    {insight.sender.category}
                                  </p>
                                  <div className="mt-3 flex flex-col gap-2">
                                    {insight.sender.details.length > 0 ? (
                                      insight.sender.details.map((detail) => (
                                        <div
                                          key={`${insight.id}-${detail.label}`}
                                          className="flex items-center justify-between gap-4"
                                        >
                                          <span className="text-xs" style={{ color: "#9b7c5d" }}>{detail.label}</span>
                                          <span className="text-sm text-right" style={{ color: "#3f2c1d" }}>{detail.value}</span>
                                        </div>
                                      ))
                                    ) : (
                                      <p className="text-xs" style={{ color: "#9b7c5d" }}>
                                        Shared details are not available for this confession.
                                      </p>
                                    )}
                                  </div>
                                </>
                              ) : (
                                <div className="mt-2 flex flex-col gap-2">
                                  <p className="text-sm font-medium" style={{ color: "#3f2c1d" }}>
                                    New confession insight
                                  </p>
                                  <p className="text-xs leading-relaxed" style={{ color: "#9b7c5d" }}>
                                    This insight came in after your last unlock. 
                                  </p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                  );
                })()}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pendingInsightUnlock && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 overflow-y-auto px-4 pt-20 pb-6 sm:px-4 sm:py-8"
            style={{ background: "rgba(102, 74, 44, 0.34)" }}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.96 }}
              className="mx-auto w-full max-w-xl rounded-3xl p-6 sm:my-auto sm:p-7"
              style={{ background: "linear-gradient(180deg, #fffaf3 0%, #f3e6d7 100%)", border: "1px solid rgba(184,159,126,0.3)" }}
            >
              <h2 className="text-xl font-semibold" style={{ color: "#3f2c1d" }}>
                Unlock {pendingInsightUnlock.name}&apos;s insights?
              </h2>
              <div
                className="mt-4 rounded-2xl p-4 flex flex-col gap-3"
                style={{ background: "rgba(255,251,245,0.88)", border: "1px solid rgba(184,159,126,0.22)" }}
              >
                <p className="text-sm leading-relaxed" style={{ color: "#4a3521" }}>
                  You will see the sender&apos;s shared category and profile details like college, school, workplace, gym, or neighbourhood info when available.
                </p>
                <p className="text-sm leading-relaxed" style={{ color: "#4a3521" }}>
                  This does not reveal the confession message itself. It shows the identity clues the sender chose to attach to those confessions that are included in this unlock.
                </p>
                <p className="text-sm leading-relaxed" style={{ color: "#4a3521" }}>
                  Future confessions are not included in this purchase. If new confessions arrive later, they will appear locked until you unlock insights again.
                </p>
              </div>
              <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPendingInsightUnlock(null)}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium"
                  style={{ background: "rgba(255,251,245,0.9)", border: "1px solid rgba(184,159,126,0.3)", color: "#8c7257" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void confirmInsightUnlock()}
                  disabled={loadingInsightsFor === pendingInsightUnlock.id}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #8f6a46, #d7b892)" }}
                >
                  {loadingInsightsFor === pendingInsightUnlock.id ? "Processing..." : `Continue To Payment (${formatInr(currentPricing.viewInsights)})`}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <ManualPaymentDialog
        open={showInsightPaymentDialog && Boolean(pendingInsightUnlock)}
        title={pendingInsightUnlock ? `Unlock ${pendingInsightUnlock.name}'s insights` : "Unlock profile insights"}
        description={`Pay ${formatInr(currentPricing.viewInsights)} and submit the UTR. Insights unlock only after staff review confirms the payment.`}
        amount={currentPricing.viewInsights}
        qrCodeDataUrl={paymentCatalog.qrCodes.viewInsights}
        pending={loadingInsightsFor !== null}
        submitLabel="Submit Insight Payment"
        onClose={() => setShowInsightPaymentDialog(false)}
        onSubmit={submitInsightPayment}
      />
    </div>
  );
}






