import type { Metadata } from "next";
import { LegalPageShell } from "@/components/LegalPageShell";
import { formatInr, pricing } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Terms & Conditions | iConfess",
  description: "Terms and conditions governing use of iConfess.",
};

export default function TermsAndConditionsPage() {
  return (
    <LegalPageShell
      title="Terms and Conditions"
      description="These Terms and Conditions govern access to and use of iConfess. By using the platform, you agree to comply with these terms."
    >
      <section className="space-y-3">
        <h2 className="text-xl font-semibold" style={{ color: "#000000" }}>
          1. Platform Nature
        </h2>
        <p>
          iConfess is a digital platform that enables users to create structured profiles, discover other profiles through permitted search methods, and send anonymous confessions or related interactions within the product experience.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold" style={{ color: "#000000" }}>
          2. Eligibility
        </h2>
        <p>
          You must provide accurate registration information and must be legally capable of entering into a binding agreement under applicable law. Users are responsible for maintaining the confidentiality of their credentials.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold" style={{ color: "#000000" }}>
          3. Acceptable Use
        </h2>
        <p>Users must not misuse the platform. Prohibited conduct includes harassment, impersonation, threats, abusive content, unlawful activity, spam, unauthorized data collection, and attempts to compromise system security or privacy.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold" style={{ color: "#000000" }}>
          4. User Content
        </h2>
        <p>
          Users remain responsible for the content they submit. By using the service, users confirm that their submissions do not violate any law or the rights of any third party. iConfess may remove, restrict, or review content that appears unsafe, abusive, fraudulent, or unlawful.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold" style={{ color: "#000000" }}>
          5. Payments and Digital Features
        </h2>
        <p>
          Certain product features may be offered for a fee. Any payment made through the platform is for access to digital product functionality only. Access terms, pricing, and entitlement may change from time to time at the platform&apos;s discretion.
        </p>
        <p>
          The current planned pricing is {formatInr(pricing.sendConfession)} per sent confession card, {formatInr(pricing.unlockReceivedConfessionCard)} per received confession card, {formatInr(pricing.viewInsights)} for profile insights, and {formatInr(pricing.unlockReceivedConfessionPage)} for received confessions page access for {pricing.unlockReceivedConfessionPageMonths} months.
        </p>
        <p>
          Received confessions page access and individual received-card access are separate entitlements. Under the current model, page access expiry may restrict viewing of previously purchased received cards until the page access is renewed.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold" style={{ color: "#000000" }}>
          6. Privacy and Data Handling
        </h2>
        <p>
          Use of iConfess is also governed by the Privacy Policy. Users acknowledge that the platform processes registration details, profile information, search activity, and interaction data as necessary to operate the service.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold" style={{ color: "#000000" }}>
          7. Suspension and Termination
        </h2>
        <p>
          iConfess may suspend or terminate access, restrict features, or remove content if a user violates these terms, poses a safety risk, abuses the platform, or interferes with other users or system operations.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold" style={{ color: "#000000" }}>
          8. Disclaimer
        </h2>
        <p>
          The platform is provided on an as-available basis. iConfess does not guarantee uninterrupted access, delivery success in every case, or specific user outcomes, including responses, matches, or mutual reveals.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold" style={{ color: "#000000" }}>
          9. Limitation of Liability
        </h2>
        <p>
          To the maximum extent permitted by law, iConfess shall not be liable for indirect, incidental, consequential, special, or punitive damages arising from platform use, user interactions, third-party integrations, or temporary service unavailability.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold" style={{ color: "#000000" }}>
          10. Contact
        </h2>
        <p>
          For support, grievances, or legal communication, contact{" "}
          <a className="text-[#c084fc] underline-offset-4 hover:underline" href="mailto:rocid003@gmail.com">
            rocid003@gmail.com
          </a>
          .
        </p>
      </section>
    </LegalPageShell>
  );
}
