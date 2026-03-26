"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Phone, ArrowRight, MessageSquare, AtSign } from "lucide-react";
import { locationCategories, locationFields, type LocationCategory } from "@/lib/matching";
import { formatInr, pricing } from "@/lib/pricing";
import { toast } from "sonner";

type FlowType = "profile" | "phone" | "social";

export default function SendConfession({
  sentCount,
}: {
  sentCount: number;
}) {
  const [flow, setFlow] = useState<FlowType>("profile");
  const [selectedCategory, setSelectedCategory] = useState<LocationCategory | null>(null);
  const [matchDetails, setMatchDetails] = useState<Record<string, string>>({});
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [targetPhone, setTargetPhone] = useState("");
  const [socialPlatform, setSocialPlatform] = useState<"instagram" | "snapchat">("instagram");
  const [socialHandle, setSocialHandle] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const categoryFieldsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!selectedCategory) return;
    categoryFieldsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selectedCategory]);
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) { toast.error("Write your confession first"); return; }
    if (!firstName.trim()) { toast.error("First name is required"); return; }
    if (flow === "profile" && !selectedCategory) { toast.error("Select a location category"); return; }
    if (flow === "phone" && !/^\d{10}$/.test(targetPhone)) { toast.error("Enter a valid 10-digit number"); return; }
    if (flow === "social" && !socialHandle.trim()) { toast.error("Enter a valid social handle"); return; }

    setLoading(true);
    try {
      const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
      const body = flow === "profile"
        ? {
            flow: "profile",
            location: selectedCategory,
            matchDetails: { ...matchDetails, firstName: firstName.trim(), ...(lastName.trim() ? { lastName: lastName.trim() } : {}), fullName },
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            message,
          }
        : flow === "phone"
          ? { flow: "phone", targetPhone: "+91" + targetPhone, firstName: firstName.trim(), lastName: lastName.trim(), message }
          : {
              flow: "social",
              platform: socialPlatform,
              handle: socialHandle.trim(),
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              message,
            };

      const res = await fetch("/api/confessions/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.requiresPayment) {
        // Razorpay will be integrated — for now show a toast
          toast.info(`Payment required: ${formatInr(pricing.sendConfession)}. Razorpay coming soon.`);
      } else {
        setSent(true);
        toast.success(data.matchFound ? "Confession delivered!" : "Confession queued — we'll notify you when matched.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send confession");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="py-2 flex flex-col items-center justify-center min-h-[60vh]">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="text-center"
        >
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(244,114,182,0.15))", border: "1px solid rgba(192,132,252,0.3)" }}>
            <Send className="w-8 h-8" style={{ color: "#c084fc" }} />
          </div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: "#f0eeff" }}>Confession Sent</h2>
          <p className="text-sm mb-8" style={{ color: "#9b98c8" }}>
            We&apos;ll keep you updated on every step.
          </p>
          <button
            onClick={() => {
              setSent(false);
              setMessage("");
              setMatchDetails({});
              setSelectedCategory(null);
              setFirstName("");
              setLastName("");
              setTargetPhone("");
              setSocialHandle("");
            }}
            className="px-6 py-2.5 rounded-xl text-sm font-medium text-white"
            style={{ background: "linear-gradient(135deg, #7c3aed, #c084fc)" }}>
            Send Another
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="py-2 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: "#f0eeff" }}>Send a Confession</h1>
        <p className="text-sm mt-1" style={{ color: "#9b98c8" }}>
          Each confession card is priced at {formatInr(pricing.sendConfession)}. Payment integration will be enabled once the gateway is approved.
        </p>
      </div>

      <div
        className="rounded-2xl p-4 mb-6"
        style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.15)" }}
      >
        <p className="text-xs uppercase tracking-[0.14em]" style={{ color: "#6f6b98" }}>
          Current sending price
        </p>
        <p className="mt-2 text-xl font-semibold" style={{ color: "#f0eeff" }}>
          {formatInr(pricing.sendConfession)} per confession card
        </p>
      </div>

      {/* Flow toggle */}
      <div
        className="grid grid-cols-1 sm:grid-cols-3 gap-1 p-1 rounded-xl mb-6 w-full sm:w-fit"
        style={{ background: "rgba(30,30,63,0.4)", border: "1px solid #1e1e3f" }}
      >
        {(["profile", "phone", "social"] as FlowType[]).map((f) => (
          <button key={f} onClick={() => setFlow(f)}
            className="px-5 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: flow === f ? "rgba(124,58,237,0.3)" : "transparent",
              color: flow === f ? "#c084fc" : "#9b98c8",
              border: flow === f ? "1px solid rgba(192,132,252,0.3)" : "1px solid transparent",
            }}>
            {f === "profile" ? "Find by details" : f === "phone" ? "I have their number" : "Social Media"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="glass rounded-2xl p-4 sm:p-5">
          <h3 className="text-sm font-medium mb-3" style={{ color: "#9b98c8" }}>Who is this for?</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "#9b98c8" }}>
                First Name *
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                className="w-full px-4 py-2.5 rounded-xl text-sm border"
                style={{ background: "rgba(30,30,63,0.5)", borderColor: "#1e1e3f", color: "#f0eeff" }}
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "#9b98c8" }}>
                Last Name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name (optional)"
                className="w-full px-4 py-2.5 rounded-xl text-sm border"
                style={{ background: "rgba(30,30,63,0.5)", borderColor: "#1e1e3f", color: "#f0eeff" }}
              />
            </div>
          </div>
          <p className="text-xs mt-2" style={{ color: "#4a4870" }}>
            First name is mandatory. Last name is optional but helps narrow the profile.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {flow === "profile" && (
            <motion.div key="profile-flow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="glass rounded-2xl p-4 sm:p-5 flex flex-col gap-4">
              <h3 className="text-sm font-medium" style={{ color: "#9b98c8" }}>Where did you meet them?</h3>
              <div className="grid grid-cols-1 gap-2">
                {locationCategories.map((cat) => (
                  <button key={cat.id} type="button"
                    onClick={() => { setSelectedCategory(cat.id); setMatchDetails({}); }}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-left transition-all"
                    style={{
                      background: selectedCategory === cat.id ? "rgba(124,58,237,0.15)" : "rgba(30,30,63,0.3)",
                      border: `1px solid ${selectedCategory === cat.id ? "rgba(192,132,252,0.4)" : "#1e1e3f"}`,
                      color: selectedCategory === cat.id ? "#c084fc" : "#9b98c8",
                    }}>
                    <span>{cat.emoji}</span><span>{cat.label}</span>
                  </button>
                ))}
              </div>

              {selectedCategory && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  ref={categoryFieldsRef}
                  className="flex flex-col gap-3 pt-2 border-t" style={{ borderColor: "#1e1e3f" }}>
                  <p className="text-xs" style={{ color: "#4a4870" }}>
                    Fill in what you know — we&apos;ll match against our database.
                  </p>
                  {locationFields[selectedCategory].map((field) => (
                    <div key={field.key}>
                      <label className="text-xs font-medium mb-1 block" style={{ color: "#9b98c8" }}>{field.label}</label>
                      {field.options ? (
                        <select value={matchDetails[field.key] || ""}
                          onChange={(e) => setMatchDetails((p) => ({ ...p, [field.key]: e.target.value }))}
                          className="w-full px-4 py-2.5 rounded-xl text-sm border"
                          style={{ background: "rgba(30,30,63,0.5)", borderColor: "#1e1e3f", color: "#f0eeff" }}>
                          <option value="">Select…</option>
                          {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input type={field.type || "text"} value={matchDetails[field.key] || ""}
                          onChange={(e) => setMatchDetails((p) => ({ ...p, [field.key]: e.target.value }))}
                          className="w-full px-4 py-2.5 rounded-xl text-sm border"
                          style={{ background: "rgba(30,30,63,0.5)", borderColor: "#1e1e3f", color: "#f0eeff" }} />
                      )}
                    </div>
                  ))}
                </motion.div>
              )}
            </motion.div>
          )}

          {flow === "phone" && (
            <motion.div key="phone-flow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="glass rounded-2xl p-4 sm:p-5">
              <h3 className="text-sm font-medium mb-3" style={{ color: "#9b98c8" }}>Their phone number</h3>
              <div className="flex gap-2">
                <span className="flex items-center px-3 rounded-xl text-sm border"
                  style={{ background: "rgba(30,30,63,0.5)", borderColor: "#1e1e3f", color: "#9b98c8" }}>+91</span>
                <input type="tel" inputMode="numeric" maxLength={10} placeholder="9876543210" value={targetPhone}
                  onChange={(e) => setTargetPhone(e.target.value.replace(/\D/g, ""))}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm border"
                  style={{ background: "rgba(30,30,63,0.5)", borderColor: "#1e1e3f", color: "#f0eeff" }} />
              </div>
              <p className="text-xs mt-2" style={{ color: "#4a4870" }}>
                <Phone className="w-3 h-3 inline mr-1" />
                If they&apos;re not on iConfess, we&apos;ll reach out via WhatsApp.
              </p>
            </motion.div>
          )}

          {flow === "social" && (
            <motion.div key="social-flow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="glass rounded-2xl p-4 sm:p-5">
              <h3 className="text-sm font-medium mb-3" style={{ color: "#9b98c8" }}>Find them by social media</h3>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {(["instagram", "snapchat"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSocialPlatform(value)}
                    className="px-4 py-2 rounded-lg text-sm"
                    style={{
                      background: socialPlatform === value ? "rgba(124,58,237,0.3)" : "rgba(30,30,63,0.3)",
                      color: socialPlatform === value ? "#c084fc" : "#9b98c8",
                      border: `1px solid ${socialPlatform === value ? "rgba(192,132,252,0.3)" : "#1e1e3f"}`,
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
                  placeholder={socialPlatform === "instagram" ? "instagram_handle" : "snapchat_handle"}
                  value={socialHandle}
                  onChange={(e) => setSocialHandle(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border"
                  style={{ background: "rgba(30,30,63,0.5)", borderColor: "#1e1e3f", color: "#f0eeff" }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Message */}
        <div className="glass rounded-2xl p-4 sm:p-5">
          <h3 className="text-sm font-medium mb-3" style={{ color: "#9b98c8" }}>
            <MessageSquare className="w-4 h-4 inline mr-1.5" />
            Your confession
          </h3>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write what you've always wanted to say…"
            rows={5}
            maxLength={1000}
            className="w-full px-4 py-3 rounded-xl text-sm border resize-none"
            style={{ background: "rgba(30,30,63,0.5)", borderColor: "#1e1e3f", color: "#f0eeff" }}
          />
          <p className="text-xs mt-1 text-right" style={{ color: "#4a4870" }}>{message.length}/1000</p>
        </div>

        <button type="submit" disabled={loading}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-all"
          style={{ background: "linear-gradient(135deg, #7c3aed 0%, #c084fc 100%)" }}>
          <Send className="w-4 h-4" />
          {loading ? "Sending…" : `Send Confession (${formatInr(pricing.sendConfession)})`}
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

    </div>
  );
}
