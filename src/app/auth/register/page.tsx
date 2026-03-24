"use client";

import { useState, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, ArrowLeft, Phone, User, MapPin } from "lucide-react";

type Step = "phone" | "otp" | "name" | "profile";
type LocationCategory = "COLLEGE" | "SCHOOL" | "WORKPLACE" | "GYM" | "NEIGHBOURHOOD";

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const prefillPhone = params.get("phone") || "";

  const [step, setStep] = useState<Step>(prefillPhone ? "name" : "phone");
  const [phone, setPhone] = useState(prefillPhone);
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<LocationCategory | null>(null);
  const [profileData, setProfileData] = useState<Record<string, string>>({});

  const categories: { id: LocationCategory; label: string; emoji: string }[] = [
    { id: "COLLEGE", label: "College / University", emoji: "🎓" },
    { id: "SCHOOL", label: "School (past)", emoji: "🏫" },
    { id: "WORKPLACE", label: "Workplace / Office", emoji: "🏢" },
    { id: "GYM", label: "Gym", emoji: "💪" },
    { id: "NEIGHBOURHOOD", label: "Neighbourhood", emoji: "🏘️" },
  ];

  const profileFields: Record<LocationCategory, { key: string; label: string; type?: string; options?: string[] }[]> = {
    COLLEGE: [
      { key: "collegeName", label: "College Name" },
      { key: "pinCode", label: "Pin Code" },
      { key: "course", label: "Course (e.g. B.Tech)" },
      { key: "branch", label: "Branch (e.g. CSE)" },
      { key: "yearOfPassing", label: "Year of Passing", type: "number" },
      { key: "section", label: "Section (e.g. A)" },
      { key: "fullName", label: "Your Full Name (as known in college)" },
    ],
    SCHOOL: [
      { key: "schoolName", label: "School Name" },
      { key: "pinCode", label: "Pin Code" },
      { key: "board", label: "Board", options: ["CBSE", "ICSE", "State Board", "IB", "IGCSE"] },
      { key: "yearOfCompletion", label: "Year of Completion", type: "number" },
      { key: "section", label: "Section (e.g. A)" },
      { key: "fullName", label: "Your Full Name (as known in school)" },
    ],
    WORKPLACE: [
      { key: "companyName", label: "Company Name" },
      { key: "department", label: "Department" },
      { key: "city", label: "City" },
      { key: "buildingName", label: "Building / Campus Name" },
      { key: "fullName", label: "Your Full Name (as known at work)" },
    ],
    GYM: [
      { key: "gymName", label: "Gym Name" },
      { key: "city", label: "City" },
      { key: "pinCode", label: "Pin Code" },
      { key: "timing", label: "Preferred Timing", options: ["MORNING", "EVENING", "BOTH"] },
      { key: "fullName", label: "Your Full Name" },
    ],
    NEIGHBOURHOOD: [
      { key: "state", label: "State" },
      { key: "city", label: "City" },
      { key: "pinCode", label: "Pin Code" },
      { key: "premisesName", label: "Society / Premises Name" },
      { key: "fullName", label: "Your Full Name" },
    ],
  };

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (phone.length !== 10) { toast.error("Enter a valid 10-digit number"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("OTP sent");
      setStep("otp");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStep("name");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid OTP");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCategory) { toast.error("Select at least one location category"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          name,
          category: selectedCategory,
          profileData,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Welcome to iConfess!");
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  const stepIndex = ["phone", "otp", "name", "profile"].indexOf(step);
  const progress = ((stepIndex + 1) / 4) * 100;

  return (
    <main className="flex items-center justify-center min-h-screen px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold gradient-text">iConfess</Link>
          <p className="text-sm mt-2" style={{ color: "#9b98c8" }}>Create your account</p>
        </div>

        {/* Progress bar */}
        <div className="mb-6 h-0.5 rounded-full" style={{ background: "#1e1e3f" }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: "linear-gradient(90deg, #7c3aed, #c084fc)" }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Phone */}
          {step === "phone" && (
            <motion.div key="phone" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="glass rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Phone className="w-4 h-4" style={{ color: "#c084fc" }} />
                <h2 className="font-semibold" style={{ color: "#f0eeff" }}>Your phone number</h2>
              </div>
              <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: "#9b98c8" }}>Phone Number</label>
                  <div className="flex gap-2">
                    <span className="flex items-center px-3 rounded-xl text-sm border" style={{ background: "rgba(30,30,63,0.5)", borderColor: "#1e1e3f", color: "#9b98c8" }}>+91</span>
                    <input type="tel" inputMode="numeric" maxLength={10} placeholder="9876543210" value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                      className="flex-1 px-4 py-2.5 rounded-xl text-sm border"
                      style={{ background: "rgba(30,30,63,0.5)", borderColor: "#1e1e3f", color: "#f0eeff" }} required />
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #7c3aed 0%, #c084fc 100%)" }}>
                  <Phone className="w-4 h-4" />{loading ? "Sending..." : "Send OTP"}
                </button>
              </form>
            </motion.div>
          )}

          {/* Step 2: OTP */}
          {step === "otp" && (
            <motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="glass rounded-2xl p-6">
              <h2 className="font-semibold mb-1" style={{ color: "#f0eeff" }}>Enter OTP</h2>
              <p className="text-xs mb-4" style={{ color: "#9b98c8" }}>Sent to +91 {phone}</p>
              <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
                <input type="text" inputMode="numeric" maxLength={6} placeholder="• • • • • •" value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  className="w-full px-4 py-3 rounded-xl border text-center tracking-[0.5em] text-lg"
                  style={{ background: "rgba(30,30,63,0.5)", borderColor: "#1e1e3f", color: "#f0eeff" }} required />
                <button type="submit" disabled={loading}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #7c3aed 0%, #c084fc 100%)" }}>
                  Verify <ArrowRight className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => setStep("phone")} className="text-xs text-center" style={{ color: "#4a4870" }}>Change number</button>
              </form>
            </motion.div>
          )}

          {/* Step 3: Name */}
          {step === "name" && (
            <motion.div key="name" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="glass rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-4 h-4" style={{ color: "#c084fc" }} />
                <h2 className="font-semibold" style={{ color: "#f0eeff" }}>What&apos;s your name?</h2>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); if (name.trim()) setStep("profile"); }} className="flex flex-col gap-4">
                <input type="text" placeholder="Your full name" value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm border"
                  style={{ background: "rgba(30,30,63,0.5)", borderColor: "#1e1e3f", color: "#f0eeff" }} required />
                <p className="text-xs" style={{ color: "#4a4870" }}>This is your display name on iConfess.</p>
                <button type="submit"
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium text-white hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, #7c3aed 0%, #c084fc 100%)" }}>
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </motion.div>
          )}

          {/* Step 4: Profile Details */}
          {step === "profile" && (
            <motion.div key="profile" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="glass rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-4 h-4" style={{ color: "#c084fc" }} />
                <h2 className="font-semibold" style={{ color: "#f0eeff" }}>Where can people find you?</h2>
              </div>
              <p className="text-xs mb-5" style={{ color: "#9b98c8" }}>
                This helps us match confessions to you. Pick one that applies most.
              </p>

              {/* Category selector */}
              <div className="grid grid-cols-1 gap-2 mb-5">
                {categories.map((cat) => (
                  <button key={cat.id} type="button"
                    onClick={() => { setSelectedCategory(cat.id); setProfileData({}); }}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-left transition-all"
                    style={{
                      background: selectedCategory === cat.id ? "rgba(124,58,237,0.15)" : "rgba(30,30,63,0.3)",
                      border: `1px solid ${selectedCategory === cat.id ? "rgba(192,132,252,0.4)" : "#1e1e3f"}`,
                      color: selectedCategory === cat.id ? "#c084fc" : "#9b98c8",
                    }}>
                    <span>{cat.emoji}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>

              {/* Fields for selected category */}
              {selectedCategory && (
                <form onSubmit={handleRegister} className="flex flex-col gap-3">
                  <div className="h-px mb-1" style={{ background: "#1e1e3f" }} />
                  {profileFields[selectedCategory].map((field) => (
                    <div key={field.key}>
                      <label className="text-xs font-medium mb-1 block" style={{ color: "#9b98c8" }}>{field.label}</label>
                      {field.options ? (
                        <select value={profileData[field.key] || ""} onChange={(e) => setProfileData((p) => ({ ...p, [field.key]: e.target.value }))}
                          className="w-full px-4 py-2.5 rounded-xl text-sm border"
                          style={{ background: "rgba(30,30,63,0.5)", borderColor: "#1e1e3f", color: "#f0eeff" }} required>
                          <option value="">Select...</option>
                          {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input type={field.type || "text"} value={profileData[field.key] || ""}
                          onChange={(e) => setProfileData((p) => ({ ...p, [field.key]: e.target.value }))}
                          className="w-full px-4 py-2.5 rounded-xl text-sm border"
                          style={{ background: "rgba(30,30,63,0.5)", borderColor: "#1e1e3f", color: "#f0eeff" }} required />
                      )}
                    </div>
                  ))}
                  <div className="flex gap-2 mt-2">
                    <button type="button" onClick={() => setStep("name")}
                      className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-sm border"
                      style={{ borderColor: "#1e1e3f", color: "#9b98c8" }}>
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <button type="submit" disabled={loading}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                      style={{ background: "linear-gradient(135deg, #7c3aed 0%, #c084fc 100%)" }}>
                      {loading ? "Creating account..." : "Create Account"}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-center text-xs mt-4" style={{ color: "#4a4870" }}>
          Already have an account?{" "}
          <Link href="/auth/login" className="gradient-text font-medium">Sign in</Link>
        </p>
      </motion.div>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
