"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Inbox, Lock, MessageSquare, Send, Sparkles } from "lucide-react";
import { formatInr, getCombinedReceivedUnlockPrice, pricing } from "@/lib/pricing";
import { toast } from "sonner";

type Confession = {
  id: string;
  direction: "sent" | "received";
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
  counterpartAnonymousId: string;
  counterpartName: string | null;
  counterpartContext: string | null;
};

type TabKey = "received" | "sent";

function EmptyState({ tab }: { tab: TabKey }) {
  return (
    <div className="text-center py-24">
      {tab === "received" ? (
        <Inbox className="w-10 h-10 mx-auto mb-4" style={{ color: "#1e1e3f" }} />
      ) : (
        <Send className="w-10 h-10 mx-auto mb-4" style={{ color: "#1e1e3f" }} />
      )}
      <p className="font-medium" style={{ color: "#4a4870" }}>
        {tab === "received" ? "No received confessions yet" : "No sent confessions yet"}
      </p>
    </div>
  );
}

function ConfessionCard({
  confession,
  pageUnlocked,
  onUnlockCard,
  onReply,
  onRevealConsent,
}: {
  confession: Confession;
  pageUnlocked: boolean;
  onUnlockCard: (id: string) => Promise<void>;
  onReply: (id: string, reply: string) => Promise<void>;
  onRevealConsent: (id: string) => Promise<void>;
}) {
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isReceived = confession.direction === "received";
  const canRead = !isReceived || (pageUnlocked && confession.isUnlocked);
  const hasConsented = isReceived ? confession.targetRevealConsent : confession.senderRevealConsent;
  const identityLabel = confession.revealedAt && confession.counterpartName
    ? confession.counterpartName
    : confession.counterpartAnonymousId;
  const identityMeta = confession.revealedAt
    ? confession.counterpartContext
    : isReceived
      ? "Anonymous sender"
      : "Anonymous recipient";

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
      {confession.mutualDetected && (
        <div
          className="flex flex-wrap items-center gap-2 px-4 sm:px-5 py-2.5 text-sm font-medium"
          style={{
            background: "linear-gradient(90deg, rgba(244,114,182,0.15), rgba(192,132,252,0.1))",
            borderBottom: "1px solid rgba(244,114,182,0.2)",
          }}
        >
          <Sparkles className="w-4 h-4" style={{ color: "#f472b6" }} />
          <span style={{ color: "#f472b6" }}>Mutual confession detected!</span>
          {!hasConsented && !confession.revealedAt && (
            <button
              onClick={() => onRevealConsent(confession.id)}
              className="ml-auto text-xs px-3 py-1 rounded-lg font-medium"
              style={{ background: "rgba(244,114,182,0.2)", color: "#f472b6" }}
            >
              Reveal identity
            </button>
          )}
          {hasConsented && !confession.revealedAt && (
            <span className="ml-auto text-xs" style={{ color: "#9b98c8" }}>
              Waiting for other person...
            </span>
          )}
          {confession.revealedAt && (
            <span className="ml-auto text-xs" style={{ color: "#9b98c8" }}>
              Identity revealed
            </span>
          )}
        </div>
      )}

      <div className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
          <div className="min-w-0">
            <p className="text-xs font-medium" style={{ color: "#f0eeff" }}>
              {isReceived ? "From" : "To"}
            </p>
            <p className="text-sm font-semibold mt-1 break-words" style={{ color: "#f0eeff" }}>
              {identityLabel}
            </p>
            {identityMeta && (
              <p className="text-xs mt-1" style={{ color: "#9b98c8" }}>
                {identityMeta}
              </p>
            )}
            <p className="text-xs" style={{ color: "#4a4870" }}>
              {new Date(confession.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
          <span
            className={`self-start sm:self-auto text-xs px-2.5 py-1 rounded-full whitespace-nowrap status-${confession.status.toLowerCase()}`}
          >
            {confession.status.charAt(0) + confession.status.slice(1).toLowerCase()}
          </span>
        </div>

        {canRead ? (
          <p className="text-sm leading-relaxed mb-4" style={{ color: "#f0eeff" }}>
            &quot;{confession.message}&quot;
          </p>
        ) : (
          <div
            className="rounded-xl px-4 py-6 mb-4 text-center"
            style={{ background: "rgba(30,30,63,0.4)", border: "1px dashed #1e1e3f" }}
          >
            <Lock className="w-5 h-5 mx-auto mb-2" style={{ color: "#4a4870" }} />
            <p className="text-sm" style={{ color: "#4a4870" }}>
              {!pageUnlocked
                ? `Unlock your received confessions page for ${pricing.unlockReceivedConfessionPageMonths} months to read this`
                : "Unlock this card individually to read"}
            </p>
          </div>
        )}

        {isReceived && pageUnlocked && !confession.isUnlocked && (
          <button
            onClick={() => onUnlockCard(confession.id)}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-white w-full sm:w-auto"
            style={{ background: "linear-gradient(135deg, #7c3aed, #c084fc)" }}
          >
            <Lock className="w-3.5 h-3.5" />
            {`Unlock this card (${formatInr(pricing.unlockReceivedConfessionCard)})`}
          </button>
        )}

        {canRead && isReceived && !confession.reply && !showReply && (
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
              placeholder="Write your reply..."
              rows={3}
              maxLength={500}
              className="w-full px-4 py-3 rounded-xl text-sm border resize-none"
              style={{ background: "rgba(30,30,63,0.5)", borderColor: "#1e1e3f", color: "#f0eeff" }}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowReply(false)}
                className="px-4 py-2 rounded-lg text-xs border"
                style={{ borderColor: "#1e1e3f", color: "#9b98c8" }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-lg text-xs font-medium text-white disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #7c3aed, #c084fc)" }}
              >
                {submitting ? "Sending..." : "Send Reply"}
              </button>
            </div>
          </form>
        )}

        {confession.reply && (
          <div
            className="mt-3 rounded-xl px-4 py-3"
            style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.15)" }}
          >
            <p className="text-xs mb-1" style={{ color: "#34d399" }}>
              {isReceived ? "Your reply" : "They replied"}
            </p>
            <p className="text-sm" style={{ color: "#f0eeff" }}>{confession.reply}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function ConfessionsInbox({
  receivedConfessions,
  sentConfessions,
  pageUnlocked,
}: {
  receivedConfessions: Confession[];
  sentConfessions: Confession[];
  pageUnlocked: boolean;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("received");
  const [receivedItems, setReceivedItems] = useState(receivedConfessions);
  const [sentItems, setSentItems] = useState(sentConfessions);
  const [unlockingPage, setUnlockingPage] = useState(false);
  const currentReceivedCardCost = pricing.unlockReceivedConfessionCard * receivedItems.length;
  const combinedReceivedCost = getCombinedReceivedUnlockPrice(receivedItems.length);

  const visibleItems = useMemo(
    () => (activeTab === "received" ? receivedItems : sentItems),
    [activeTab, receivedItems, sentItems]
  );

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
    try {
      const res = await fetch("/api/payments/unlock-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Card unlocked!");
      setReceivedItems((prev) => prev.map((item) => item.id === confessionId ? { ...item, isUnlocked: true, status: "OPENED" } : item));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Payment failed");
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
      setReceivedItems((prev) => prev.map((item) => item.id === confessionId ? { ...item, reply, status: "REPLIED" } : item));
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
      toast.success(data.revealed ? "Identities revealed!" : "Consent recorded. Waiting for the other person.");
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div className="py-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: "#f0eeff" }}>My Confessions</h1>
          <p className="text-sm mt-1" style={{ color: "#9b98c8" }}>
            Track both the confessions you sent and the ones you received.
          </p>
        </div>
        {!pageUnlocked && receivedItems.length > 0 && (
          <button
            onClick={handleUnlockPage}
            disabled={unlockingPage}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50 w-full sm:w-auto"
            style={{ background: "linear-gradient(135deg, #7c3aed, #c084fc)" }}
          >
            <Lock className="w-4 h-4" />
            {unlockingPage ? "Processing..." : `Unlock Page for ${pricing.unlockReceivedConfessionPageMonths} Months (${formatInr(pricing.unlockReceivedConfessionPage)})`}
          </button>
        )}
      </div>

      {!pageUnlocked && activeTab === "received" && (
        <div
          className="rounded-2xl p-4 mb-6"
          style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.15)" }}
        >
          <p className="text-xs uppercase tracking-[0.14em]" style={{ color: "#6f6b98" }}>
            Received confessions pricing
          </p>
          <div className="mt-3 flex flex-col gap-1 text-sm" style={{ color: "#f0eeff" }}>
            <p>{`Page unlock for ${pricing.unlockReceivedConfessionPageMonths} months: ${formatInr(pricing.unlockReceivedConfessionPage)}`}</p>
            <p>{`${receivedItems.length} card${receivedItems.length === 1 ? "" : "s"} currently in inbox: ${formatInr(currentReceivedCardCost)}`}</p>
            <p>{`Page + all current cards: ${formatInr(combinedReceivedCost)}`}</p>
          </div>
          <p className="mt-3 text-xs leading-relaxed" style={{ color: "#9b98c8" }}>
            You can unlock only the page first, or later pay separately for individual cards. Under the current model, page access expires after {pricing.unlockReceivedConfessionPageMonths} months and must be renewed to view received cards again, even if those cards were purchased earlier.
          </p>
        </div>
      )}

      <div
        className="grid grid-cols-2 gap-1 p-1 rounded-xl mb-6 w-full sm:w-fit"
        style={{ background: "rgba(30,30,63,0.4)", border: "1px solid #1e1e3f" }}
      >
        {([
          { key: "received", label: `Received (${receivedItems.length})` },
          { key: "sent", label: `Sent (${sentItems.length})` },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="px-5 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: activeTab === tab.key ? "rgba(124,58,237,0.3)" : "transparent",
              color: activeTab === tab.key ? "#c084fc" : "#9b98c8",
              border: activeTab === tab.key ? "1px solid rgba(192,132,252,0.3)" : "1px solid transparent",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {visibleItems.length === 0 ? (
        <EmptyState tab={activeTab} />
      ) : (
        <div className="flex flex-col gap-5">
          <AnimatePresence>
            {visibleItems.map((confession) => (
              <ConfessionCard
                key={confession.id}
                confession={confession}
                pageUnlocked={pageUnlocked}
                onUnlockCard={handleUnlockCard}
                onReply={handleReply}
                onRevealConsent={handleRevealConsent}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {!pageUnlocked && receivedItems.length > 0 && (
        <div
          className="rounded-2xl p-4 flex items-start gap-3 mt-6"
          style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.15)" }}
        >
          <Heart className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#c084fc" }} />
          <p className="text-xs leading-relaxed" style={{ color: "#9b98c8" }}>
            Unlock the received tab for {formatInr(pricing.unlockReceivedConfessionPage)} for {pricing.unlockReceivedConfessionPageMonths} months. Individual received cards are priced separately at {formatInr(pricing.unlockReceivedConfessionCard)} each. Sent confessions remain visible without the page unlock.
          </p>
        </div>
      )}
    </div>
  );
}
