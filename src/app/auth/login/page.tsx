"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, LockKeyhole, User } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
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

  return (
    <main className="flex items-center justify-center min-h-screen px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold gradient-text">
            iConfess
          </Link>
          <p className="text-sm mt-2" style={{ color: "#9b98c8" }}>
            Sign in with your username and password
          </p>
        </div>

        <div className="glass rounded-2xl p-6">
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: "#9b98c8" }}>
                Username
              </label>
              <div className="relative">
                <User
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: "#9b98c8" }}
                />
                <input
                  type="text"
                  autoComplete="username"
                  placeholder="your_username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border"
                  style={{
                    background: "rgba(30,30,63,0.5)",
                    borderColor: "#1e1e3f",
                    color: "#f0eeff",
                  }}
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: "#9b98c8" }}>
                Password
              </label>
              <div className="relative">
                <LockKeyhole
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: "#9b98c8" }}
                />
                <input
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border"
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
              {loading ? "Signing in..." : "Sign In"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
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
