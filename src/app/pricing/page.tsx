import type { Metadata } from "next";
import { LegalPageShell } from "@/components/LegalPageShell";
import { formatInr, getCombinedReceivedUnlockPrice, pricing } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Pricing | iConfess",
  description: "Official pricing for paid iConfess features.",
};

export default function PricingPage() {
  const exampleCards = 2;

  return (
    <LegalPageShell
      title="Pricing"
      description="These are the current planned iConfess prices for premium actions and access layers."
    >
      <section className="space-y-4">
        <h2 className="text-xl font-semibold" style={{ color: "#3f2c1d" }}>
          Core Pricing
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl p-5" style={{ background: "rgba(255,251,245,0.78)", border: "1px solid rgba(179,148,111,0.22)" }}>
            <p className="text-xs uppercase tracking-[0.14em]" style={{ color: "#9b7c5d" }}>
              Send confession
            </p>
            <p className="mt-2 text-2xl font-semibold" style={{ color: "#3f2c1d" }}>
              {formatInr(pricing.sendConfession)}
            </p>
            <p className="mt-2 text-sm" style={{ color: "#735a43" }}>
              Charged per confession card sent.
            </p>
          </div>
          <div className="rounded-2xl p-5" style={{ background: "rgba(255,251,245,0.78)", border: "1px solid rgba(179,148,111,0.22)" }}>
            <p className="text-xs uppercase tracking-[0.14em]" style={{ color: "#9b7c5d" }}>
              Read received confession card
            </p>
            <p className="mt-2 text-2xl font-semibold" style={{ color: "#3f2c1d" }}>
              {formatInr(pricing.unlockReceivedConfessionCard)}
            </p>
            <p className="mt-2 text-sm" style={{ color: "#735a43" }}>
              Charged per received confession card.
            </p>
          </div>
          <div className="rounded-2xl p-5" style={{ background: "rgba(255,251,245,0.78)", border: "1px solid rgba(179,148,111,0.22)" }}>
            <p className="text-xs uppercase tracking-[0.14em]" style={{ color: "#9b7c5d" }}>
              View insights
            </p>
            <p className="mt-2 text-2xl font-semibold" style={{ color: "#3f2c1d" }}>
              {formatInr(pricing.viewInsights)}
            </p>
            <p className="mt-2 text-sm" style={{ color: "#735a43" }}>
              Covers only the confessions available at the time of purchase.
            </p>
          </div>
          <div className="rounded-2xl p-5" style={{ background: "rgba(255,251,245,0.78)", border: "1px solid rgba(179,148,111,0.22)" }}>
            <p className="text-xs uppercase tracking-[0.14em]" style={{ color: "#9b7c5d" }}>
              Unlock received confessions page
            </p>
            <p className="mt-2 text-2xl font-semibold" style={{ color: "#3f2c1d" }}>
              {formatInr(pricing.unlockReceivedConfessionPage)}
            </p>
            <p className="mt-2 text-sm" style={{ color: "#735a43" }}>
              Unlocks the page for {pricing.unlockReceivedConfessionPageMonths} months. Individual cards are still paid separately.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold" style={{ color: "#3f2c1d" }}>
          How Received Confession Unlocking Works
        </h2>
        <p>
          The received confessions area has two paid layers. First, the page itself can be unlocked for{" "}
          {formatInr(pricing.unlockReceivedConfessionPage)} for {pricing.unlockReceivedConfessionPageMonths} months.
          Second, each received confession card can be unlocked individually for{" "}
          {formatInr(pricing.unlockReceivedConfessionCard)}.
        </p>
        <p>
          Under the current model, individually purchased cards remain purchased, but they are viewable only while the received confessions page access is active. If page access expires, the user must renew the page unlock to view those previously purchased cards again.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold" style={{ color: "#3f2c1d" }}>
          Example Calculation
        </h2>
        <p>
          If a user has {exampleCards} received confessions, the UI may show:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Page unlock for {pricing.unlockReceivedConfessionPageMonths} months: {formatInr(pricing.unlockReceivedConfessionPage)}</li>
          <li>{exampleCards} confession cards: {formatInr(pricing.unlockReceivedConfessionCard * exampleCards)}</li>
          <li>Total for page + all current cards: {formatInr(getCombinedReceivedUnlockPrice(exampleCards))}</li>
        </ul>
        <p>
          The user may still choose to unlock only the page first and purchase cards later.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold" style={{ color: "#3f2c1d" }}>
          Insight Purchase Scope
        </h2>
        <p>
          The {formatInr(pricing.viewInsights)} insight purchase is scoped to currently available confessions only. If additional confessions arrive later, those new items are not included in the previous insight purchase and may require a new insights unlock.
        </p>
      </section>
    </LegalPageShell>
  );
}
