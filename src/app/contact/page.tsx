import type { Metadata } from "next";
import { getAppSettings } from "@/lib/app-settings";
import { LegalPageShell } from "@/components/LegalPageShell";

export const metadata: Metadata = {
  title: "Contact | iConfess",
  description: "Official contact information for iConfess.",
};

export default async function ContactPage() {
  const appSettings = await getAppSettings();

  return (
    <LegalPageShell
      title="Contact Details"
      description="Use the details below for customer support, grievance communication, payment support, or general business queries related to iConfess."
      helpEmail={appSettings.contactEmail}
    >
      <section className="space-y-3">
        <h2 className="text-xl font-semibold" style={{ color: "#3f2c1d" }}>
          Support Contact
        </h2>
        <p>
          Email:{" "}
          <a className="text-[#8f6a46] underline-offset-4 hover:underline" href={`mailto:${appSettings.contactEmail}`}>
            {appSettings.contactEmail}
          </a>
        </p>
        <p>Website: https://iconfess.in</p>
        <p>Support hours: Reasonable business hours on working days. Response times may vary based on query volume.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold" style={{ color: "#3f2c1d" }}>
          Query Types
        </h2>
        <p>Users may contact iConfess for account access issues, payment support, refund requests, policy questions, privacy concerns, and grievance reporting.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold" style={{ color: "#3f2c1d" }}>
          Important Note
        </h2>
        <p>
          iConfess operates as a digital platform. Communication is primarily handled over email. Users are advised to include their registered phone number when requesting account-specific support.
        </p>
      </section>
    </LegalPageShell>
  );
}
