"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Inbox, Lock, MessageSquare, Send, Sparkles } from "lucide-react";
import { formatInr, pricing } from "@/lib/pricing";
import { toast } from "sonner";

type Confession = {
  id: string;
  direction: "sent" | "received";
  location: string;
  matchDetails: Record<string, unknown>;
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
  counterpartGender: "MALE" | "FEMALE" | "OTHER" | null;
  counterpartContext: string | null;
};

type TabKey = "received" | "sent";
const identityRevealPrice = 1499;

function formatGenderLabel(gender: "MALE" | "FEMALE" | "OTHER" | null) {
  if (!gender) return null;
  if (gender === "MALE") return "Male";
  if (gender === "FEMALE") return "Female";
  return "Other";
}

function getIdentityRevealPricing(pageUnlocked: boolean, cardUnlocked: boolean) {
  const needsPageUnlock = !pageUnlocked;
  const needsCardUnlock = !cardUnlocked;
  const total =
    identityRevealPrice +
    (needsCardUnlock ? pricing.unlockReceivedConfessionCard : 0) +
    (needsPageUnlock ? pricing.unlockReceivedConfessionPage : 0);

  if (!needsPageUnlock && !needsCardUnlock) {
    return {
      total,
      summary: `This mutual identity reveal will cost ${formatInr(identityRevealPrice)} for you.`,
      detail: "Your My Confessions page and this confession card are already unlocked, so only the identity reveal charge applies in your case.",
    };
  }

  if (!needsPageUnlock && needsCardUnlock) {
    return {
      total,
      summary: `This mutual identity reveal will cost ${formatInr(total)} for you.`,
      detail: `That includes ${formatInr(identityRevealPrice)} for identity reveal and ${formatInr(pricing.unlockReceivedConfessionCard)} to unlock this confession card.`,
    };
  }

  if (needsPageUnlock && !needsCardUnlock) {
    return {
      total,
      summary: `This mutual identity reveal will cost ${formatInr(total)} for you.`,
      detail: `That includes ${formatInr(identityRevealPrice)} for identity reveal and ${formatInr(pricing.unlockReceivedConfessionPage)} to unlock your My Confessions page.`,
    };
  }

  return {
    total,
    summary: `This mutual identity reveal will cost ${formatInr(total)} for you.`,
    detail: `That includes ${formatInr(identityRevealPrice)} for identity reveal, ${formatInr(pricing.unlockReceivedConfessionCard)} to unlock this confession card, and ${formatInr(pricing.unlockReceivedConfessionPage)} to unlock your My Confessions page.`,
  };
}

function EmptyState({ tab }: { tab: TabKey }) {
  return (
    <div className="text-center py-24">
      {tab === "received" ? (
        <Inbox className="w-10 h-10 mx-auto mb-4" style={{ color: "#8f6a46" }} />
      ) : (
        <Send className="w-10 h-10 mx-auto mb-4" style={{ color: "#8f6a46" }} />
      )}
      <p className="font-medium" style={{ color: "#735a43" }}>
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
  onRevealConsent: (id: string) => void;
}) {
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isReceived = confession.direction === "received";
  const canRead = !isReceived || (pageUnlocked && confession.isUnlocked);
  const unlockCardPrice = pageUnlocked ? pricing.unlockReceivedConfessionCard : pricing.unlockReceivedConfessionCard + pricing.unlockReceivedConfessionPage;
  const isSent = confession.direction === "sent";
  const hasConsented = isReceived ? confession.targetRevealConsent : confession.senderRevealConsent;
  const identityLabel = isSent
    ? (confession.counterpartName ?? confession.counterpartAnonymousId)
    : confession.revealedAt && confession.counterpartName
      ? confession.counterpartName
      : confession.counterpartAnonymousId;
  const identityMeta = isSent
    ? (confession.counterpartContext ?? "Recipient identity visible to you")
    : confession.revealedAt
      ? confession.counterpartContext
      : "Anonymous sender";
  const previewGender = isReceived && !confession.revealedAt ? formatGenderLabel(confession.counterpartGender) : null;

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
      {isReceived && confession.mutualDetected && (
        <div
          className="flex flex-wrap items-center gap-2 px-4 sm:px-5 py-2.5 text-sm font-medium"
          style={{
            background: "linear-gradient(90deg, rgba(214,185,150,0.24), rgba(255,251,245,0.72))",
            borderBottom: "1px solid rgba(179,148,111,0.24)",
          }}
        >
          <Sparkles className="w-4 h-4" style={{ color: "#8f6a46" }} />
          <span style={{ color: "#8f6a46" }}>Mutual Confession!</span>
          {!hasConsented && !confession.revealedAt && (
            <button
              onClick={() => onRevealConsent(confession.id)}
              className="ml-auto text-xs px-3 py-1 rounded-lg font-medium"
              style={{ background: "rgba(143,106,70,0.14)", color: "#8f6a46", border: "1px solid rgba(179,148,111,0.24)" }}
            >
              Reveal identity
            </button>
          )}
          {hasConsented && !confession.revealedAt && (
            <span className="ml-auto text-xs" style={{ color: "#9b7c5d" }}>
              Waiting for other person...
            </span>
          )}
          {confession.revealedAt && (
            <span className="ml-auto text-xs" style={{ color: "#9b7c5d" }}>
              Identity revealed
            </span>
          )}
        </div>
      )}

      <div className="p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium" style={{ color: "#8f6a46" }}>
              {isReceived ? "From" : "To"}
            </p>
            <p className="text-sm font-semibold mt-1 break-words" style={{ color: "#3f2c1d" }}>
              {identityLabel}
            </p>
            {identityMeta && (
              <p className="text-xs mt-1" style={{ color: "#9b7c5d" }}>
                {identityMeta}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0 text-right">
            {previewGender && (
              <p className="text-xs" style={{ color: "#8f6a46" }}>
                Gender: {previewGender}
              </p>
            )}
            <p className="text-xs" style={{ color: "#9b7c5d" }}>
              {new Date(confession.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
            {!isReceived && (
              <span
                className={`mt-0.5 text-xs px-2.5 py-1 rounded-full whitespace-nowrap status-${confession.status.toLowerCase()}`}
              >
                {confession.status.charAt(0) + confession.status.slice(1).toLowerCase()}
              </span>
            )}
          </div>
        </div>

        {canRead ? (
          <p className="text-sm leading-relaxed mb-4" style={{ color: "#4a3521" }}>
            &quot;{confession.message}&quot;
          </p>
        ) : (
          <div
            className="rounded-xl px-4 py-6 mb-4 text-center"
            style={{ background: "rgba(255,248,240,0.84)", border: "1px dashed rgba(179,148,111,0.45)" }}
          >
            <Lock className="w-5 h-5 mx-auto mb-2" style={{ color: "#9b7c5d" }} />
            <p className="text-sm" style={{ color: "#735a43" }}>
              {!pageUnlocked
                ? `Unlock this card to open it and activate My Confessions access for ${pricing.unlockReceivedConfessionPageMonths} months`
                : "Unlock this card individually to read"}
            </p>
          </div>
        )}

        {isReceived && !confession.isUnlocked && (
          <div className="flex justify-center">
            <button
              onClick={() => onUnlockCard(confession.id)}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-white w-full sm:w-auto"
              style={{ background: "linear-gradient(135deg, #8f6a46, #d7b892)" }}
            >
              <Lock className="w-3.5 h-3.5" />
              {`Unlock this card (${formatInr(unlockCardPrice)})`}
            </button>
          </div>
        )}

        {canRead && isReceived && !confession.reply && !showReply && (
          <div className="flex justify-center">
            <button
              onClick={() => setShowReply(true)}
              className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg transition-all"
              style={{ background: "rgba(143,106,70,0.1)", color: "#8f6a46", border: "1px solid rgba(179,148,111,0.22)" }}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Reply
            </button>
          </div>
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
              style={{ background: "rgba(255,251,245,0.92)", borderColor: "rgba(184,159,126,0.35)", color: "#3f2c1d" }}
            />
            <div className="flex justify-center">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowReply(false)}
                  className="px-4 py-2 rounded-lg text-xs border"
                  style={{ borderColor: "rgba(184,159,126,0.35)", color: "#9b7c5d", background: "rgba(255,251,245,0.86)" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-white disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #8f6a46, #d7b892)" }}
                >
                  {submitting ? "Sending..." : "Send Reply"}
                </button>
              </div>
            </div>
          </form>
        )}

        {confession.reply && (
          <div
            className="mt-3 rounded-xl px-4 py-3"
            style={{ background: "rgba(240,253,244,0.9)", border: "1px solid rgba(74,163,90,0.22)" }}
          >
            <p className="text-xs mb-1" style={{ color: "#2f7d32" }}>
              {isReceived ? "Your reply" : "They replied"}
            </p>
            <p className="text-sm" style={{ color: "#3f2c1d" }}>{confession.reply}</p>
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
  const [sentItems] = useState(sentConfessions);
  const [unlockingPage, setUnlockingPage] = useState(false);
  const [pendingUnlockCardId, setPendingUnlockCardId] = useState<string | null>(null);
  const [pendingRevealConfession, setPendingRevealConfession] = useState<Confession | null>(null);
  const [unlockingCardId, setUnlockingCardId] = useState<string | null>(null);
  const [revealingConfessionId, setRevealingConfessionId] = useState<string | null>(null);
  const [currentPageUnlocked, setCurrentPageUnlocked] = useState(pageUnlocked);
  const revealPricing = pendingRevealConfession
    ? getIdentityRevealPricing(currentPageUnlocked, pendingRevealConfession.isUnlocked)
    : null;
  const visibleItems = useMemo(
    () => (activeTab === "received" ? receivedItems : sentItems),
    [activeTab, receivedItems, sentItems]
  );
  const lockedReceivedCount = useMemo(
    () => receivedItems.filter((item) => !item.isUnlocked).length,
    [receivedItems]
  );
  const shouldLockEntirePage = !currentPageUnlocked && lockedReceivedCount === 0;

  async function handleUnlockPage() {
    setUnlockingPage(true);
    try {
      const res = await fetch("/api/payments/unlock-page", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Confession page unlocked!");
      setCurrentPageUnlocked(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setUnlockingPage(false);
    }
  }

  async function performUnlockCard(confessionId: string) {
    try {
      setUnlockingCardId(confessionId);
      const res = await fetch("/api/payments/unlock-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Card unlocked!");
      if (data.pageUnlocked) {
        setCurrentPageUnlocked(true);
      }
      setReceivedItems((prev) => prev.map((item) => item.id === confessionId ? { ...item, isUnlocked: true, status: "OPENED" } : item));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setUnlockingCardId(null);
    }
  }

  async function handleUnlockCard(confessionId: string) {
    if (!currentPageUnlocked) {
      setPendingUnlockCardId(confessionId);
      return;
    }

    await performUnlockCard(confessionId);
  }

  async function confirmUnlockCard() {
    if (!pendingUnlockCardId) return;
    const confessionId = pendingUnlockCardId;
    setPendingUnlockCardId(null);
    await performUnlockCard(confessionId);
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
    setRevealingConfessionId(confessionId);
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
    } finally {
      setRevealingConfessionId(null);
    }
  }

  function requestRevealConsent(confessionId: string) {
    const confession = [...receivedItems, ...sentItems].find((item) => item.id === confessionId) ?? null;
    setPendingRevealConfession(confession);
  }

  async function confirmRevealConsent() {
    if (!pendingRevealConfession) return;

    const confessionId = pendingRevealConfession.id;
    setPendingRevealConfession(null);
    await handleRevealConsent(confessionId);
  }

  return (
    <div className="py-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: "#3f2c1d" }}>My Confessions</h1>
        </div>
      </div>

      {shouldLockEntirePage ? (
        <div
          className="rounded-2xl p-6 sm:p-8 text-center"
          style={{ background: "linear-gradient(180deg, rgba(255,251,245,0.96) 0%, rgba(248,239,229,0.92) 100%)", border: "1px solid rgba(184,159,126,0.3)" }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "rgba(143,106,70,0.14)", border: "1px solid rgba(179,148,111,0.24)" }}
          >
            <Lock className="w-6 h-6" style={{ color: "#8f6a46" }} />
          </div>
          <h2 className="text-lg sm:text-xl font-semibold" style={{ color: "#3f2c1d" }}>
            Unlock My Confessions
          </h2>
          <p className="text-sm mt-3 max-w-xl mx-auto leading-relaxed" style={{ color: "#735a43" }}>
            Unlock this page to access your sent and received confessions for next {pricing.unlockReceivedConfessionPageMonths} months. Each received card must be unlocked separately.
          </p>
          <button
            onClick={handleUnlockPage}
            disabled={unlockingPage}
            className="mt-6 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #8f6a46, #d7b892)" }}
          >
            <Lock className="w-4 h-4" />
            {unlockingPage ? "Processing..." : `Unlock for ${pricing.unlockReceivedConfessionPageMonths} Months (${formatInr(pricing.unlockReceivedConfessionPage)})`}
          </button>
        </div>
      ) : (
        <>
      <div
        className="grid grid-cols-2 gap-1 p-1 rounded-xl mb-6 w-full sm:w-fit"
        style={{ background: "rgba(255,248,240,0.9)", border: "1px solid rgba(184,159,126,0.3)" }}
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
              background: activeTab === tab.key ? "rgba(143,106,70,0.12)" : "transparent",
              color: activeTab === tab.key ? "#8f6a46" : "#9b7c5d",
              border: activeTab === tab.key ? "1px solid rgba(179,148,111,0.24)" : "1px solid transparent",
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
                pageUnlocked={currentPageUnlocked}
                onUnlockCard={handleUnlockCard}
                onReply={handleReply}
                onRevealConsent={requestRevealConsent}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {pendingUnlockCardId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 overflow-y-auto px-4 pt-24 pb-4 sm:px-6 sm:pt-8 sm:pb-8"
            style={{ background: "rgba(102, 74, 44, 0.34)" }}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.96 }}
              className="mx-auto my-4 w-full max-w-xl rounded-3xl p-6 sm:my-0 sm:p-7"
              style={{ background: "linear-gradient(180deg, #fffaf3 0%, #f3e6d7 100%)", border: "1px solid rgba(184,159,126,0.3)" }}
            >
              <h2 className="text-xl font-semibold" style={{ color: "#3f2c1d" }}>
                Confirm This Unlock
              </h2>
              <p className="text-sm mt-3 leading-relaxed" style={{ color: "#735a43" }}>
                This payment is {formatInr(1299)} in total.
              </p>
              <div
                className="mt-4 rounded-2xl p-4 flex flex-col gap-3"
                style={{ background: "rgba(255,251,245,0.88)", border: "1px solid rgba(184,159,126,0.22)" }}
              >
                <p className="text-sm leading-relaxed" style={{ color: "#4a3521" }}>
                  {formatInr(999)} to unlock this card permanently.
                </p>
                <p className="text-sm leading-relaxed" style={{ color: "#4a3521" }}>
                  {formatInr(300)} unlocks your My Confessions page for the next {pricing.unlockReceivedConfessionPageMonths} months, so you won&apos;t pay this page-access amount again for other cards during that period.
                </p>
              </div>
              <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPendingUnlockCardId(null)}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium"
                  style={{ background: "rgba(255,251,245,0.9)", border: "1px solid rgba(184,159,126,0.3)", color: "#8c7257" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmUnlockCard}
                  disabled={unlockingCardId !== null}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #8f6a46, #d7b892)" }}
                >
                  {unlockingCardId ? "Processing..." : "Unlock Now"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pendingRevealConfession && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 overflow-y-auto px-4 pt-24 pb-4 sm:px-6 sm:pt-8 sm:pb-8"
            style={{ background: "rgba(102, 74, 44, 0.34)" }}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.96 }}
              className="mx-auto my-4 w-full max-w-xl rounded-3xl p-6 sm:my-0 sm:p-7"
              style={{ background: "linear-gradient(180deg, #fffaf3 0%, #f3e6d7 100%)", border: "1px solid rgba(184,159,126,0.3)" }}
            >
              <h2 className="text-xl font-semibold" style={{ color: "#3f2c1d" }}>
                Confirm Identity Reveal
              </h2>
              <p className="text-sm mt-3 leading-relaxed" style={{ color: "#735a43" }}>
                {revealPricing?.summary}
              </p>
              <div
                className="mt-4 rounded-2xl p-4 flex flex-col gap-3"
                style={{ background: "rgba(255,251,245,0.88)", border: "1px solid rgba(184,159,126,0.22)" }}
              >
                <p className="text-sm leading-relaxed" style={{ color: "#4a3521" }}>
                  {revealPricing?.detail}
                </p>
                <p className="text-sm leading-relaxed" style={{ color: "#4a3521" }}>
                  If the other person also agrees on their side, both of you will be able to see each other&apos;s real identity on this match instead of the anonymous ID.
                </p>
                <p className="text-sm leading-relaxed" style={{ color: "#4a3521" }}>
                  If they have not agreed yet, your consent will be saved and the reveal will happen only after they confirm and complete their payment too.
                </p>
              </div>
              <p className="text-xs mt-4 leading-relaxed" style={{ color: "#9b7c5d" }}>
                This action is only for this mutual match and does not unlock any extra profile details beyond what the reveal flow already shows.
              </p>
              <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPendingRevealConfession(null)}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium"
                  style={{ background: "rgba(255,251,245,0.9)", border: "1px solid rgba(184,159,126,0.3)", color: "#8c7257" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmRevealConsent}
                  disabled={revealingConfessionId !== null}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #8f6a46, #d7b892)" }}
                >
                  {revealingConfessionId === pendingRevealConfession.id ? "Processing..." : `Yes, Reveal Identity (${formatInr(revealPricing?.total ?? identityRevealPrice)})`}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </>
      )}
    </div>
  );
}




