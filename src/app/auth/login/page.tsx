"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, Phone } from "lucide-react";

type Step = "phone" | "otp";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (phone.length !== 10) {
      toast.error("Enter a valid 10-digit phone number");
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
      toast.success("OTP sent via call");
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
      if (data.isNewUser) {
        router.push("/auth/register?phone=" + phone);
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid OTP");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex items-center justify-center min-h-screen px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold gradient-text">
            iConfess
          </Link>
          <p className="text-sm mt-2" style={{ color: "#9b98c8" }}>
            Sign in to your account
          </p>
        </div>

        <div className="glass rounded-2xl p-6">
          {step === "phone" ? (
            <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: "#9b98c8" }}>
                  Phone Number
                </label>
                <div className="flex gap-2">
                  <span
                    className="flex items-center px-3 rounded-xl text-sm border"
                    style={{
                      background: "rgba(30,30,63,0.5)",
                      borderColor: "#1e1e3f",
                      color: "#9b98c8",
                    }}
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
                    style={{
                      background: "rgba(30,30,63,0.5)",
                      borderColor: "#1e1e3f",
                      color: "#f0eeff",
                    }}
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #7c3aed 0%, #c084fc 100%)" }}
              >
                <Phone className="w-4 h-4" />
                {loading ? "Sending..." : "Send OTP via Call"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: "#9b98c8" }}>
                  Enter OTP sent to +91 {phone}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="• • • • • •"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  className="w-full px-4 py-2.5 rounded-xl text-sm border text-center tracking-[0.5em] text-lg"
                  style={{
                    background: "rgba(30,30,63,0.5)",
                    borderColor: "#1e1e3f",
                    color: "#f0eeff",
                  }}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #7c3aed 0%, #c084fc 100%)" }}
              >
                {loading ? "Verifying..." : "Verify & Sign In"}
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setStep("phone")}
                className="text-xs text-center"
                style={{ color: "#4a4870" }}
              >
                Change number
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs mt-4" style={{ color: "#4a4870" }}>
          New here?{" "}
          <Link href="/auth/register" className="gradient-text font-medium">
            Create account
          </Link>
        </p>
      </motion.div>
    </main>
  );
}
