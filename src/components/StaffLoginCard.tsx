"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, LockKeyhole, Shield, User } from "lucide-react";
import { toast } from "sonner";

type StaffLoginCardProps = {
  hasAdmin: boolean;
};

export default function StaffLoginCard({ hasAdmin }: StaffLoginCardProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      const endpoint = hasAdmin ? "/api/internal/login" : "/api/internal/bootstrap";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          hasAdmin
            ? { username, password }
            : { name, username, password }
        ),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error);
      }

      router.push(data.role === "ADMIN" ? "/admin" : "/employee");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to continue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex items-center justify-center min-h-screen px-4 py-10 sm:py-16">
      <div className="w-full max-w-sm glass rounded-3xl p-6 sm:p-7">
        <div className="text-center mb-6">
          <Link href="/" className="text-xl sm:text-2xl font-bold gradient-text">
            iConfess Internal
          </Link>
          <p className="text-sm mt-2" style={{ color: "#8c7257" }}>
            {hasAdmin
              ? "Sign in to the admin or employee workspace"
              : "Create the first admin account for the internal panel"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!hasAdmin && (
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: "#9b7c5d" }}>
                Full name
              </label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#9b7c5d" }} />
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border"
                  style={{ background: "rgba(255,251,245,0.92)", borderColor: "rgba(184,159,126,0.35)", color: "#3f2c1d" }}
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: "#9b7c5d" }}>
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#9b7c5d" }} />
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value.toLowerCase())}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border"
                style={{ background: "rgba(255,251,245,0.92)", borderColor: "rgba(184,159,126,0.35)", color: "#3f2c1d" }}
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
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border"
                style={{ background: "rgba(255,251,245,0.92)", borderColor: "rgba(184,159,126,0.35)", color: "#3f2c1d" }}
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
            {loading ? "Please wait..." : hasAdmin ? "Sign In" : "Create First Admin"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </main>
  );
}
