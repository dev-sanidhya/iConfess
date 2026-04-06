"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, LockKeyhole, Phone, KeyRound, ArrowLeft } from "lucide-react";

type ViewMode = "login" | "recover";
type RecoveryStep = "phone" | "otp" | "reset";

export default function LoginPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>("login");
  const [recoveryStep, setRecoveryStep] = useState<RecoveryStep>("phone");

  const [loginPhone, setLoginPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  function resetRecoveryState() {
    setRecoveryStep("phone");
    setPhone("");
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (loginPhone.length !== 10) {
      toast.error("Enter a valid 10-digit phone number");
      return;
    }
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: loginPhone, password }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to sign in");
    } finally {
      setLoading(false);
    }
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (phone.length !== 10) {
      toast.error("Enter a valid 10-digit number");
      return;
    }

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
      setRecoveryStep("otp");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error("Enter the 6-digit OTP");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.isNewUser) {
        toast.error("This phone number is not registered yet. Create an account instead.");
        router.push(`/auth/register?phone=${phone}`);
        return;
      }

      setRecoveryStep("reset");
      toast.success("Phone number verified");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid OTP");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetCredentials(e: React.FormEvent) {
    e.preventDefault();

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          password: newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Password updated. Sign in with your phone number and new password.");
      setViewMode("login");
      setLoginPhone(phone);
      setPassword("");
      resetRecoveryState();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update credentials");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex items-center justify-center min-h-screen px-4 py-10 sm:py-16">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-6 sm:mb-8">
          <Link href="/" className="text-xl sm:text-2xl font-bold gradient-text">
            iConfess
          </Link>
          <p className="text-sm mt-2" style={{ color: "#80664c" }}>
            {viewMode === "login"
              ? "Sign in with your phone number and password"
              : "Reset your password with OTP verification"}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {viewMode === "login" ? (
            <motion.div
              key="login-view"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="glass rounded-2xl p-5 sm:p-6"
            >
              <form onSubmit={handleLogin} className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: "#9b7c5d" }}>
                    Phone number
                  </label>
                  <div className="flex gap-2">
                    <span className="flex items-center px-3 rounded-xl text-sm border" style={{ background: "rgba(255,251,245,0.84)", borderColor: "rgba(179,148,111,0.24)", color: "#80664c" }}>
                      +91
                    </span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      maxLength={10}
                      placeholder="9876543210"
                      value={loginPhone}
                      onChange={(e) => setLoginPhone(e.target.value.replace(/\D/g, ""))}
                      className="flex-1 px-4 py-2.5 rounded-xl text-sm border"
                      style={{ background: "rgba(255,251,245,0.84)", borderColor: "rgba(179,148,111,0.24)", color: "#3f2c1d" }}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: "#9b7c5d" }}>
                    Password
                  </label>
                  <div className="relative">
                    <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#9b7c5d" }} />
                    <input
                      type="password"
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border"
                      style={{ background: "rgba(255,251,245,0.84)", borderColor: "rgba(179,148,111,0.24)", color: "#3f2c1d" }}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #8f6a46 0%, #d7b892 100%)" }}
                >
                  {loading ? "Signing in..." : "Sign In"}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <button
                type="button"
                onClick={() => {
                  resetRecoveryState();
                  setViewMode("recover");
                }}
                className="w-full mt-4 text-sm font-medium"
                style={{ color: "#8f6a46" }}
              >
                Forgot password?
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="recover-view"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="glass rounded-2xl p-5 sm:p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4" style={{ color: "#8f6a46" }} />
                  <h2 className="font-semibold" style={{ color: "#3f2c1d" }}>
                    Recover access
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode("login");
                    resetRecoveryState();
                  }}
                  className="text-xs"
                  style={{ color: "#80664c" }}
                >
                  Back to sign in
                </button>
              </div>

              {recoveryStep === "phone" && (
                <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
                  <p className="text-xs" style={{ color: "#80664c" }}>
                    Enter your registered mobile number. We&apos;ll verify it by OTP before letting you reset your password.
                  </p>
                  <div>
                    <label className="text-xs font-medium mb-1.5 block" style={{ color: "#9b7c5d" }}>
                      Registered mobile number
                    </label>
                    <div className="flex gap-2">
                      <span className="flex items-center px-3 rounded-xl text-sm border" style={{ background: "rgba(255,251,245,0.84)", borderColor: "rgba(179,148,111,0.24)", color: "#80664c" }}>
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
                        style={{ background: "rgba(255,251,245,0.84)", borderColor: "rgba(179,148,111,0.24)", color: "#3f2c1d" }}
                        required
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg, #8f6a46 0%, #d7b892 100%)" }}
                  >
                    <Phone className="w-4 h-4" />
                    {loading ? "Sending..." : "Send OTP"}
                  </button>
                </form>
              )}

              {recoveryStep === "otp" && (
                <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
                  <p className="text-xs" style={{ color: "#80664c" }}>
                    Enter the OTP sent to +91 {phone}.
                  </p>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="• • • • • •"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    className="w-full px-4 py-3 rounded-xl border text-center tracking-[0.5em] text-lg"
                    style={{ background: "rgba(255,251,245,0.84)", borderColor: "rgba(179,148,111,0.24)", color: "#3f2c1d" }}
                    required
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg, #8f6a46 0%, #d7b892 100%)" }}
                  >
                    {loading ? "Verifying..." : "Verify OTP"}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecoveryStep("phone")}
                    className="flex items-center justify-center gap-1 text-xs"
                    style={{ color: "#80664c" }}
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Change number
                  </button>
                </form>
              )}

              {recoveryStep === "reset" && (
                <form onSubmit={handleResetCredentials} className="flex flex-col gap-4">
                  <div
                    className="rounded-xl px-4 py-3"
                    style={{ background: "rgba(255,251,245,0.8)", border: "1px solid rgba(179,148,111,0.24)" }}
                  >
                    <p className="text-[11px] uppercase tracking-[0.14em]" style={{ color: "#9b7c5d" }}>
                      Verified mobile
                    </p>
                    <p className="text-sm mt-1" style={{ color: "#3f2c1d" }}>+91 {phone}</p>
                  </div>

                  <div>
                    <label className="text-xs font-medium mb-1.5 block" style={{ color: "#9b7c5d" }}>
                      New password
                    </label>
                    <div className="relative">
                      <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#9b7c5d" }} />
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border"
                        style={{ background: "rgba(255,251,245,0.84)", borderColor: "rgba(179,148,111,0.24)", color: "#3f2c1d" }}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium mb-1.5 block" style={{ color: "#9b7c5d" }}>
                      Confirm new password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl text-sm border"
                      style={{ background: "rgba(255,251,245,0.84)", borderColor: "rgba(179,148,111,0.24)", color: "#3f2c1d" }}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg, #8f6a46 0%, #d7b892 100%)" }}
                  >
                    {loading ? "Updating..." : "Update password"}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-center text-xs mt-4" style={{ color: "#9b7c5d" }}>
          New here?{" "}
          <Link href="/auth/register" className="gradient-text font-medium">
            Create account
          </Link>
        </p>
      </motion.div>
    </main>
  );
}
