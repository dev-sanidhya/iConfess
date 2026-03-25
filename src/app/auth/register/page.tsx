"use client";

import { useState, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, ArrowLeft, Phone, User, MapPin, LockKeyhole } from "lucide-react";
import { locationCategories, locationFields, type LocationCategory } from "@/lib/matching";
import type { Gender } from "@prisma/client";

type Step = "phone" | "otp" | "name" | "profile";
function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const prefillPhone = params.get("phone") || "";

  const [step, setStep] = useState<Step>(prefillPhone ? "name" : "phone");
  const [phone, setPhone] = useState(prefillPhone);
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [snapchatHandle, setSnapchatHandle] = useState("");
  const [loading, setLoading] = useState(false);
  const [primaryCategory, setPrimaryCategory] = useState<LocationCategory | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<LocationCategory[]>([]);
  const [profileDetailsByCategory, setProfileDetailsByCategory] = useState<
    Partial<Record<LocationCategory, Record<string, string>>>
  >({});

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
      if (!data.isNewUser) {
        toast.error("This phone number already has an account. Sign in instead.");
        router.push("/auth/login");
        return;
      }
      setStep("name");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid OTP");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (selectedCategories.length === 0) { toast.error("Select at least one location category"); return; }
    if (!primaryCategory || !selectedCategories.includes(primaryCategory)) {
      toast.error("Choose your primary category");
      return;
    }
    if (username.trim().length < 3) { toast.error("Username must be at least 3 characters"); return; }
    if (!/^[a-z0-9_]+$/.test(username.trim().toLowerCase())) {
      toast.error("Username can only use lowercase letters, numbers, and underscores");
      return;
    }
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (password !== confirmPassword) { toast.error("Passwords do not match"); return; }
    if (!gender) { toast.error("Select your gender"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          name,
          username,
          password,
          gender,
          instagramHandle,
          snapchatHandle,
          primaryCategory,
          selectedCategories,
          profileDetailsByCategory,
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
    <main className="flex items-center justify-center min-h-screen px-4 py-10 sm:py-16">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-6 sm:mb-8">
          <Link href="/" className="text-xl sm:text-2xl font-bold gradient-text">iConfess</Link>
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
            <motion.div key="phone" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="glass rounded-2xl p-5 sm:p-6">
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
            <motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="glass rounded-2xl p-5 sm:p-6">
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
            <motion.div key="name" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="glass rounded-2xl p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-4 h-4" style={{ color: "#c084fc" }} />
                <h2 className="font-semibold" style={{ color: "#f0eeff" }}>Set your account details</h2>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                if (!name.trim()) return;
                if (username.trim().length < 3) {
                  toast.error("Username must be at least 3 characters");
                  return;
                }
                if (!/^[a-z0-9_]+$/.test(username.trim().toLowerCase())) {
                  toast.error("Username can only use lowercase letters, numbers, and underscores");
                  return;
                }
                if (password.length < 8) {
                  toast.error("Password must be at least 8 characters");
                  return;
                }
                if (!gender) {
                  toast.error("Select your gender");
                  return;
                }
                if (password !== confirmPassword) {
                  toast.error("Passwords do not match");
                  return;
                }
                setStep("profile");
              }} className="flex flex-col gap-4">
                <input type="text" placeholder="Your full name" value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm border"
                  style={{ background: "rgba(30,30,63,0.5)", borderColor: "#1e1e3f", color: "#f0eeff" }} required />
                <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  className="w-full px-4 py-2.5 rounded-xl text-sm border"
                  style={{ background: "rgba(30,30,63,0.5)", borderColor: "#1e1e3f", color: "#f0eeff" }} required />
                <select value={gender} onChange={(e) => setGender(e.target.value as Gender)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm border"
                  style={{ background: "rgba(30,30,63,0.5)", borderColor: "#1e1e3f", color: "#f0eeff" }} required>
                  <option value="">Select gender</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
                <div className="relative">
                  <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#9b98c8" }} />
                  <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border"
                    style={{ background: "rgba(30,30,63,0.5)", borderColor: "#1e1e3f", color: "#f0eeff" }} required />
                </div>
                <input type="password" placeholder="Confirm password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm border"
                  style={{ background: "rgba(30,30,63,0.5)", borderColor: "#1e1e3f", color: "#f0eeff" }} required />
                <input type="text" placeholder="Instagram handle or NA Handle" value={instagramHandle} onChange={(e) => setInstagramHandle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm border"
                  style={{ background: "rgba(30,30,63,0.5)", borderColor: "#1e1e3f", color: "#f0eeff" }} required />
                <input type="text" placeholder="Snapchat handle or NA Handle" value={snapchatHandle} onChange={(e) => setSnapchatHandle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm border"
                  style={{ background: "rgba(30,30,63,0.5)", borderColor: "#1e1e3f", color: "#f0eeff" }} required />
                <p className="text-xs" style={{ color: "#4a4870" }}>
                  This is your display name on iConfess. If you do not use a platform, enter `NA Handle`.
                </p>
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
            <motion.div key="profile" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="glass rounded-2xl p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-4 h-4" style={{ color: "#c084fc" }} />
                <h2 className="font-semibold" style={{ color: "#f0eeff" }}>Where can people find you?</h2>
              </div>
              <p className="text-xs mb-5" style={{ color: "#9b98c8" }}>
                You can add multiple profiles here, like college plus gym plus workplace. Choose one as primary and we will reuse your full name automatically across all of them.
              </p>

              {/* Category selector */}
              <div className="grid grid-cols-1 gap-2 mb-5">
                {locationCategories.map((cat) => {
                  const isSelected = selectedCategories.includes(cat.id);
                  const isPrimary = primaryCategory === cat.id;
                  return (
                  <button key={cat.id} type="button"
                    onClick={() => {
                      setSelectedCategories((current) =>
                        current.includes(cat.id)
                          ? current.filter((item) => item !== cat.id)
                          : [...current, cat.id]
                      );
                      setProfileDetailsByCategory((current) => ({
                        ...current,
                        [cat.id]: current[cat.id] ?? {},
                      }));
                      setPrimaryCategory((current) => {
                        if (current === cat.id && isSelected) return null;
                        if (!current) return cat.id;
                        return current;
                      });
                    }}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-left transition-all"
                    style={{
                      background: isSelected ? "rgba(124,58,237,0.15)" : "rgba(30,30,63,0.3)",
                      border: `1px solid ${isSelected ? "rgba(192,132,252,0.4)" : "#1e1e3f"}`,
                      color: isSelected ? "#c084fc" : "#9b98c8",
                    }}>
                    <span>{cat.emoji}</span>
                    <span className="flex-1">{cat.label}</span>
                    {isSelected && (
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full"
                        style={{
                          background: isPrimary ? "rgba(244,114,182,0.18)" : "rgba(124,58,237,0.18)",
                          color: isPrimary ? "#f472b6" : "#c084fc",
                        }}
                      >
                        {isPrimary ? "Primary" : "Added"}
                      </span>
                    )}
                  </button>
                )})}
              </div>

              {selectedCategories.length > 0 && (
                <form onSubmit={handleRegister} className="flex flex-col gap-3">
                  <div className="h-px mb-1" style={{ background: "#1e1e3f" }} />
                  <p className="text-xs mb-2" style={{ color: "#9b98c8" }}>
                    Select one primary category and fill the place details only. Your name will be pulled from the identity step, so you do not need to type it again for each profile.
                  </p>
                  {selectedCategories.map((category) => (
                    <div key={category} className="rounded-xl p-4" style={{ background: "rgba(30,30,63,0.22)", border: "1px solid #1e1e3f" }}>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-medium" style={{ color: "#f0eeff" }}>
                          {locationCategories.find((item) => item.id === category)?.label}
                        </p>
                        <button
                          type="button"
                          onClick={() => setPrimaryCategory(category)}
                          className="text-[11px] px-2 py-1 rounded-full"
                          style={{
                            background: primaryCategory === category ? "rgba(244,114,182,0.18)" : "rgba(124,58,237,0.18)",
                            color: primaryCategory === category ? "#f472b6" : "#c084fc",
                          }}
                        >
                          {primaryCategory === category ? "Primary" : "Set Primary"}
                        </button>
                      </div>
                      <div className="flex flex-col gap-3">
                        {locationFields[category].map((field) => (
                          <div key={`${category}-${field.key}`}>
                            <label className="text-xs font-medium mb-1 block" style={{ color: "#9b98c8" }}>{field.label}</label>
                            {field.options ? (
                              <select
                                value={profileDetailsByCategory[category]?.[field.key] || ""}
                                onChange={(e) => setProfileDetailsByCategory((current) => ({
                                  ...current,
                                  [category]: {
                                    ...(current[category] ?? {}),
                                    [field.key]: e.target.value,
                                  },
                                }))}
                                className="w-full px-4 py-2.5 rounded-xl text-sm border"
                                style={{ background: "rgba(30,30,63,0.5)", borderColor: "#1e1e3f", color: "#f0eeff" }}
                                required
                              >
                                <option value="">Select...</option>
                                {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
                              </select>
                            ) : (
                              <input
                                type={field.type || "text"}
                                value={profileDetailsByCategory[category]?.[field.key] || ""}
                                onChange={(e) => setProfileDetailsByCategory((current) => ({
                                  ...current,
                                  [category]: {
                                    ...(current[category] ?? {}),
                                    [field.key]: e.target.value,
                                  },
                                }))}
                                className="w-full px-4 py-2.5 rounded-xl text-sm border"
                                style={{ background: "rgba(30,30,63,0.5)", borderColor: "#1e1e3f", color: "#f0eeff" }}
                                required
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-2 mt-2">
                    <button type="button" onClick={() => setStep("name")}
                      className="flex items-center justify-center gap-1 px-4 py-2.5 rounded-xl text-sm border w-12 flex-shrink-0"
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
