import type { Metadata } from "next";
import { LegalPageShell } from "@/components/LegalPageShell";
import { formatInr, pricing } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Refund & Cancellation | iConfess",
  description: "Refund and cancellation policy for digital purchases on iConfess.",
};

export default function RefundAndCancellationPage() {
  return (
    <LegalPageShell
      title="Refund and Cancellation Policy"
      description="This policy applies to payments made for digital services and product features offered through iConfess."
    >
      <section className="space-y-3">
        <h2 className="text-xl font-semibold" style={{ color: "#000000" }}>
          1. Nature of Services
        </h2>
        <p>
          iConfess provides digital services and feature unlocks. Since these are intangible and electronically delivered, cancellations and refunds are generally limited once access or delivery has been initiated.
        </p>
        <p>
          This includes digital purchases such as {formatInr(pricing.sendConfession)} confession sends, {formatInr(pricing.unlockReceivedConfessionCard)} received-card unlocks, {formatInr(pricing.viewInsights)} insights unlocks, and {formatInr(pricing.unlockReceivedConfessionPage)} received-page access for {pricing.unlockReceivedConfessionPageMonths} months.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold" style={{ color: "#000000" }}>
          2. Cancellation
        </h2>
        <p>
          Users may discontinue use of the platform at any time. However, once a paid digital feature has been purchased, processed, or unlocked, the transaction may not be cancellable unless required by applicable law or expressly approved by iConfess.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold" style={{ color: "#000000" }}>
          3. Refund Eligibility
        </h2>
        <p>Refunds may be considered only in limited situations, including:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>duplicate payment caused by a technical error;</li>
          <li>payment successful but paid feature not delivered within a reasonable period due to a verified platform issue;</li>
          <li>an unauthorized charge that is established after review and supported by reasonable evidence.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold" style={{ color: "#000000" }}>
          4. Non-Refundable Cases
        </h2>
        <p>Refunds will ordinarily not be granted for:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>change of mind after purchase;</li>
          <li>dissatisfaction with another user&apos;s response or lack of response;</li>
          <li>incorrect search or selection by the user;</li>
          <li>feature usage already consumed or delivered.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold" style={{ color: "#000000" }}>
          5. Refund Request Process
        </h2>
        <p>
          To request a refund, users should email{" "}
          <a className="text-[#c084fc] underline-offset-4 hover:underline" href="mailto:rocid003@gmail.com">
            rocid003@gmail.com
          </a>{" "}
          with transaction details, registered account information, and the reason for the request. Verified eligible refunds, if approved, will be processed within a reasonable period through the original payment method where feasible.
        </p>
      </section>
    </LegalPageShell>
  );
}
