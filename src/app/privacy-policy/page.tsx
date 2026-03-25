import type { Metadata } from "next";
import { LegalPageShell } from "@/components/LegalPageShell";

export const metadata: Metadata = {
  title: "Privacy Policy | iConfess",
  description: "Privacy policy explaining how iConfess collects and uses personal data.",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPageShell
      title="Privacy Policy"
      description="This Privacy Policy explains how iConfess collects, uses, stores, and protects user information while operating the platform."
    >
      <section className="space-y-3">
        <h2 className="text-xl font-semibold" style={{ color: "#f0eeff" }}>
          1. Information Collected
        </h2>
        <p>
          iConfess may collect registration information such as phone number, username, gender, social handles, profile details, authentication data, search input, device or browser metadata, and records of platform interactions, including confessions and related activity.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold" style={{ color: "#f0eeff" }}>
          2. Purpose of Use
        </h2>
        <p>
          Information is used to create and maintain accounts, verify users, operate search and matching flows, deliver platform features, prevent misuse, process payments where applicable, and improve product performance and security.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold" style={{ color: "#f0eeff" }}>
          3. Sharing
        </h2>
        <p>
          iConfess does not sell personal information. Data may be shared only with essential service providers or infrastructure partners required for authentication, hosting, database operations, messaging, payment processing, compliance, fraud prevention, or legal obligations.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold" style={{ color: "#f0eeff" }}>
          4. Security
        </h2>
        <p>
          Reasonable administrative and technical safeguards are used to protect user data. However, no digital system can guarantee absolute security, and users acknowledge that transmission and storage always carry some risk.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold" style={{ color: "#f0eeff" }}>
          5. Retention
        </h2>
        <p>
          Data may be retained for as long as necessary to provide the service, maintain lawful records, prevent abuse, resolve disputes, and enforce platform rules.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold" style={{ color: "#f0eeff" }}>
          6. Contact
        </h2>
        <p>
          For privacy-related requests or complaints, users may write to{" "}
          <a className="text-[#c084fc] underline-offset-4 hover:underline" href="mailto:rocid003@gmail.com">
            rocid003@gmail.com
          </a>
          .
        </p>
      </section>
    </LegalPageShell>
  );
}
