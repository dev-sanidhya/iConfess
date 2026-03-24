"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Heart, MapPin, MessageSquare, Sparkles } from "lucide-react";
import { toast } from "sonner";

type Confession = {
  id: string;
  location: string;
  matchDetails: Record<string, string>;
  message: string;
  status: string;
  reply: string | null;
  repliedAt: string | null;
  createdAt: string;
  mutualDetected: boolean;
  senderRevealConsent: boolean;
  targetRevealConsent: boolean;
  revealedAt: string | null;
  isUnlocked: boolean;
};

function ConfessionCard({ confession, pageUnlocked, onReply, onRevealConsent }: {
  confession: Confession;
  pageUnlocked: boolean;
  onReply: (id: string, reply: string) => Promise<void>;
  onRevealConsent: (id: string) => Promise<void>;
}) {
  const [replyText, setReplyText] = useState("");
  const [showReply, setShowReply] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const isVisible = pageUnlocked && confession.isUnlocked;

  const locationLabel = confession.location.charAt(0) + confession.location.slice(1).toLowerCase();

  async function submitReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyText.trim()) return;
    setSubmitting(true);
    await onReply(confession.id, replyText);
    setSubmitting(false);
    setShowReply(false);
    setReplyText("");
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="confession-card rounded-2xl overflow-hidden"
    >
      {/* Mutual banner */}
      {confession.mutualDetected && (
        <div
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium"
          style={{
            background: "linear-gradient(90deg, rgba(244,114,182,0.15), rgba(192,132,252,0.1))",
            borderBottom: "1px solid rgba(244,114,182,0.2)",
          }}
        >
          <Sparkles className="w-4 h-4" style={{ color: "#f472b6" }} />
          <span style={{ color: "#f472b6" }}>Mutual confession detected!</span>
          {!confession.targetRevealConsent && !confession.revealedAt && (
            <button
              onClick={() => onRevealConsent(confession.id)}
              className="ml-auto text-xs px-3 py-1 rounded-lg font-medium"
              style={{ background: "rgba(244,114,182,0.2)", color: "#f472b6" }}
            >
              Reveal identity
            </button>
          )}
          {confession.targetRevealConsent && !confession.revealedAt && (
            <span className="ml-auto text-xs" style={{ color: "#9b98c8" }}>Waiting for other person…</span>
          )}
        </div>
      )}

      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ background: "linear-gradient(135deg, #7c3aed, #c084fc)" }}
            >
              ?
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: "#f0eeff" }}>Anonymous</p>
              <p className="text-xs" style={{ color: "#4a4870" }}>
                {new Date(confession.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric", month: "short", year: "numeric",
                })}
              </p>
            </div>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full status-${confession.status.toLowerCase()}`}>
            {confession.status.charAt(0) + confession.status.slice(1).toLowerCase()}
          </span>
        </div>

        {/* Location */}
        <div className="flex items-center gap-1.5 mb-4">
          <MapPin className="w-3.5 h-3.5" style={{ color: "#4a4870" }} />
          <span className="text-xs" style={{ color: "#4a4870" }}>{locationLabel}</span>
        </div>

        {/* Message — locked or visible */}
        {isVisible ? (
          <p className="text-sm leading-relaxed mb-5" style={{ color: "#f0eeff" }}>
            &quot;{confession.message}&quot;
          </p>
        ) : (
          <div
            className="rounded-xl px-4 py-6 mb-5 text-center"
            style={{ background: "rgba(30,30,63,0.4)", border: "1px dashed #1e1e3f" }}
          >
            <Lock className="w-5 h-5 mx-auto mb-2" style={{ color: "#4a4870" }} />
            <p className="text-sm" style={{ color: "#4a4870" }}>
              {!pageUnlocked
                ? "Unlock your confession page to read this"
                : "Unlock this card individually to read"}
            </p>
          </div>
        )}

        {/* Reply section */}
        {isVisible && !confession.reply && !showReply && (
          <button
            onClick={() => setShowReply(true)}
            className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg transition-all"
            style={{ background: "rgba(124,58,237,0.1)", color: "#c084fc", border: "1px solid rgba(124,58,237,0.2)" }}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Reply anonymously
          </button>
        )}

        {showReply && (
          <form onSubmit={submitReply} className="mt-2 flex flex-col gap-2">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write your reply…"
              rows={3}
              maxLength={500}
              className="w-full px-4 py-3 rounded-xl text-sm border resize-none"
              style={{ background: "rgba(30,30,63,0.5)", borderColor: "#1e1e3f", color: "#f0eeff" }}
            />
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowReply(false)}
                className="px-4 py-2 rounded-lg text-xs border"
                style={{ borderColor: "#1e1e3f", color: "#9b98c8" }}>Cancel</button>
              <button type="submit" disabled={submitting}
                className="px-4 py-2 rounded-lg text-xs font-medium text-white disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #7c3aed, #c084fc)" }}>
                {submitting ? "Sending…" : "Send Reply"}
              </button>
            </div>
          </form>
        )}

        {confession.reply && (
          <div
            className="mt-2 rounded-xl px-4 py-3"
            style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.15)" }}
          >
            <p className="text-xs mb-1" style={{ color: "#34d399" }}>Your reply</p>
            <p className="text-sm" style={{ color: "#f0eeff" }}>{confession.reply}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function ConfessionsInbox({
  confessions,
  pageUnlocked,
}: {
  confessions: Confession[];
  pageUnlocked: boolean;
}) {
  const [items, setItems] = useState(confessions);
  const [unlockingPage, setUnlockingPage] = useState(false);
  const [unlockingCard, setUnlockingCard] = useState<string | null>(null);

  async function handleUnlockPage() {
    setUnlockingPage(true);
    try {
      const res = await fetch("/api/payments/unlock-page", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Confession page unlocked!");
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setUnlockingPage(false);
    }
  }

  async function handleUnlockCard(confessionId: string) {
    setUnlockingCard(confessionId);
    try {
      const res = await fetch("/api/payments/unlock-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Card unlocked!");
      setItems((prev) => prev.map((c) => c.id === confessionId ? { ...c, isUnlocked: true } : c));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setUnlockingCard(null);
    }
  }

  async function handleReply(confessionId: string, reply: string) {
    try {
      const res = await fetch("/api/confessions/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confessionId, reply }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Reply sent!");
      setItems((prev) => prev.map((c) => c.id === confessionId ? { ...c, reply, status: "REPLIED" } : c));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send reply");
    }
  }

  async function handleRevealConsent(confessionId: string) {
    try {
      const res = await fetch("/api/confessions/reveal-consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.revealed ? "Identities revealed! Check your profile." : "Consent recorded. Waiting for the other person.");
      setItems((prev) => prev.map((c) => c.id === confessionId ? { ...c, targetRevealConsent: true } : c));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div className="py-2">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: "#f0eeff" }}>My Confessions</h1>
          <p className="text-sm mt-1" style={{ color: "#9b98c8" }}>
            {confessions.length} confession{confessions.length !== 1 ? "s" : ""} received
          </p>
        </div>
        {!pageUnlocked && (
          <button
            onClick={handleUnlockPage}
            disabled={unlockingPage}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #7c3aed, #c084fc)" }}
          >
            <Lock className="w-4 h-4" />
            {unlockingPage ? "Processing…" : "Unlock Page (₹X)"}
          </button>
        )}
      </div>

      {confessions.length === 0 ? (
        <div className="text-center py-24">
          <Heart className="w-10 h-10 mx-auto mb-4" style={{ color: "#1e1e3f" }} />
          <p className="font-medium" style={{ color: "#4a4870" }}>No confessions yet</p>
          <p className="text-sm mt-1" style={{ color: "#4a4870" }}>
            Complete your profile so people can find you.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <AnimatePresence>
            {items.map((confession) => (
              <div key={confession.id}>
                <ConfessionCard
                  confession={confession}
                  pageUnlocked={pageUnlocked}
                  onReply={handleReply}
                  onRevealConsent={handleRevealConsent}
                />
                {pageUnlocked && !confession.isUnlocked && (
                  <div className="flex justify-center mt-3">
                    <button
                      onClick={() => handleUnlockCard(confession.id)}
                      disabled={unlockingCard === confession.id}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-white disabled:opacity-50"
                      style={{ background: "linear-gradient(135deg, #7c3aed, #c084fc)" }}
                    >
                      <Lock className="w-3.5 h-3.5" />
                      {unlockingCard === confession.id ? "Processing…" : "Unlock this card (₹Y)"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
