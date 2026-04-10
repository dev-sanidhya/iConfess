"use client";

import { useState, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, ArrowLeft, Phone, User, MapPin, LockKeyhole } from "lucide-react";
import { locationCategories, locationFields, type LocationCategory } from "@/lib/matching";
import type { Gender } from "@prisma/client";
import PhoneNumberField from "@/components/PhoneNumberField";

type Step = "phone" | "otp" | "name" | "profile";
function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const prefillPhone = params.get("phone") || "";

  const [step, setStep] = useState<Step>(prefillPhone ? "name" : "phone");
  const [phone, setPhone] = useState(prefillPhone);
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
          dateOfBirth,
          password,
          gender,
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
          <p className="text-sm mt-2" style={{ color: "#80664c" }}>Create your account</p>
        </div>

        {/* Progress bar */}
        <div className="mb-6 h-0.5 rounded-full" style={{ background: "rgba(179,148,111,0.24)" }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: "linear-gradient(90deg, #8f6a46, #d7b892)" }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Phone */}
          {step === "phone" && (
            <motion.div key="phone" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="glass rounded-2xl p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <Phone className="w-4 h-4" style={{ color: "#8f6a46" }} />
                <h2 className="font-semibold" style={{ color: "#3f2c1d" }}>Your phone number</h2>
              </div>
              <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: "#9b7c5d" }}>Phone Number</label>
                  <PhoneNumberField
                    maxLength={10}
                    placeholder="9876543210"
                    value={phone}
                    onChange={setPhone}
                    prefixClassName="bg-[rgba(255,251,245,0.84)] border-[rgba(179,148,111,0.24)] text-[#80664c]"
                    inputClassName="bg-[rgba(255,251,245,0.84)] border-[rgba(179,148,111,0.24)] text-[#3f2c1d]"
                    required
                  />
                </div>
                <button type="submit" disabled={loading}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #8f6a46 0%, #d7b892 100%)" }}>
                  <Phone className="w-4 h-4" />{loading ? "Sending..." : "Send OTP (via Call)"}
                </button>
              </form>
            </motion.div>
          )}

          {/* Step 2: OTP */}
          {step === "otp" && (
            <motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="glass rounded-2xl p-5 sm:p-6">
              <h2 className="font-semibold mb-1" style={{ color: "#3f2c1d" }}>Enter OTP</h2>
              <p className="text-xs mb-4" style={{ color: "#80664c" }}>Sent to +91 {phone}</p>
              <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
                <input type="text" inputMode="numeric" maxLength={6} placeholder="• • • • • •" value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  className="w-full px-4 py-3 rounded-xl border text-center tracking-[0.5em] text-lg"
                  style={{ background: "rgba(255,251,245,0.84)", borderColor: "rgba(179,148,111,0.24)", color: "#3f2c1d" }} required />
                <button type="submit" disabled={loading}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #8f6a46 0%, #d7b892 100%)" }}>
                  Verify <ArrowRight className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => setStep("phone")} className="text-xs text-center" style={{ color: "#9b7c5d" }}>Change number</button>
              </form>
            </motion.div>
          )}

          {/* Step 3: Name */}
          {step === "name" && (
            <motion.div key="name" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="glass rounded-2xl p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-4 h-4" style={{ color: "#8f6a46" }} />
                <h2 className="font-semibold" style={{ color: "#3f2c1d" }}>Set your account details</h2>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                if (!name.trim()) return;
                if (!dateOfBirth) {
                  toast.error("Enter your date of birth");
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
                  style={{ background: "rgba(255,251,245,0.84)", borderColor: "rgba(179,148,111,0.24)", color: "#3f2c1d" }} required />
                <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm border"
                  style={{ background: "rgba(255,251,245,0.84)", borderColor: "rgba(179,148,111,0.24)", color: "#3f2c1d" }} required />
                <select value={gender} onChange={(e) => setGender(e.target.value as Gender)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm border"
                  style={{ background: "rgba(255,251,245,0.84)", borderColor: "rgba(179,148,111,0.24)", color: "#3f2c1d" }} required>
                  <option value="">Select gender</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
                <div className="relative">
                  <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#9b7c5d" }} />
                  <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border"
                    style={{ background: "rgba(255,251,245,0.84)", borderColor: "rgba(179,148,111,0.24)", color: "#3f2c1d" }} required />
                </div>
                <input type="password" placeholder="Confirm password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm border"
                  style={{ background: "rgba(255,251,245,0.84)", borderColor: "rgba(179,148,111,0.24)", color: "#3f2c1d" }} required />
                <p className="text-xs" style={{ color: "#9b7c5d" }}>
                  Your phone number will be used as your sign-in ID. Date of birth cannot be changed later, so enter it carefully. You can add and verify social ownership after signup from your profile.
                </p>
                <button type="submit"
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium text-white hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, #8f6a46 0%, #d7b892 100%)" }}>
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </motion.div>
          )}

          {/* Step 4: Profile Details */}
          {step === "profile" && (
            <motion.div key="profile" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="glass rounded-2xl p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-4 h-4" style={{ color: "#8f6a46" }} />
                <h2 className="font-semibold" style={{ color: "#3f2c1d" }}>Where can people find you?</h2>
              </div>
              <p className="text-xs mb-5" style={{ color: "#80664c" }}>
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
                      background: isSelected ? "rgba(143,106,70,0.14)" : "rgba(255,251,245,0.74)",
                      border: `1px solid ${isSelected ? "rgba(143,106,70,0.35)" : "rgba(179,148,111,0.24)"}`,
                      color: isSelected ? "#8f6a46" : "#735a43",
                    }}>
                    <span>{cat.emoji}</span>
                    <span className="flex-1">{cat.label}</span>
                    {isSelected && (
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full"
                        style={{
                          background: isPrimary ? "rgba(184,121,98,0.18)" : "rgba(143,106,70,0.16)",
                          color: isPrimary ? "#b87962" : "#8f6a46",
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
                  <div className="h-px mb-1" style={{ background: "rgba(179,148,111,0.24)" }} />
                  <p className="text-xs mb-2" style={{ color: "#80664c" }}>
                    Select one primary category and fill the place details only. Your name will be pulled from the identity step, so you do not need to type it again for each profile.
                  </p>
                  {selectedCategories.map((category) => (
                    <div key={category} className="rounded-xl p-4" style={{ background: "rgba(255,251,245,0.76)", border: "1px solid rgba(179,148,111,0.24)" }}>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-medium" style={{ color: "#3f2c1d" }}>
                          {locationCategories.find((item) => item.id === category)?.label}
                        </p>
                        <button
                          type="button"
                          onClick={() => setPrimaryCategory(category)}
                          className="text-[11px] px-2 py-1 rounded-full"
                          style={{
                            background: primaryCategory === category ? "rgba(184,121,98,0.18)" : "rgba(143,106,70,0.16)",
                            color: primaryCategory === category ? "#b87962" : "#8f6a46",
                          }}
                        >
                          {primaryCategory === category ? "Primary" : "Set Primary"}
                        </button>
                      </div>
                      <div className="flex flex-col gap-3">
                        {locationFields[category].map((field) => (
                          <div key={`${category}-${field.key}`}>
                            <label className="text-xs font-medium mb-1 block" style={{ color: "#9b7c5d" }}>{field.label}</label>
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
                                style={{ background: "rgba(255,251,245,0.84)", borderColor: "rgba(179,148,111,0.24)", color: "#3f2c1d" }}
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
                                style={{ background: "rgba(255,251,245,0.84)", borderColor: "rgba(179,148,111,0.24)", color: "#3f2c1d" }}
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
                      style={{ borderColor: "rgba(179,148,111,0.24)", color: "#80664c", background: "rgba(255,251,245,0.84)" }}>
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <button type="submit" disabled={loading}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                      style={{ background: "linear-gradient(135deg, #8f6a46 0%, #d7b892 100%)" }}>
                      {loading ? "Creating account..." : "Create Account"}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-center text-xs mt-4" style={{ color: "#9b7c5d" }}>
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
