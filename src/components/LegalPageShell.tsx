import type { ReactNode } from "react";
import Link from "next/link";

type LegalPageShellProps = {
  title: string;
  description: string;
  children: ReactNode;
};

const legalLinks = [
  { href: "/terms-and-conditions", label: "Terms & Conditions" },
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/refund-and-cancellation", label: "Refund & Cancellation" },
  { href: "/contact", label: "Contact" },
];

export function LegalPageShell({ title, description, children }: LegalPageShellProps) {
  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 sm:gap-8">
        <div className="flex flex-wrap items-center gap-3 text-sm" style={{ color: "#9b98c8" }}>
          <Link href="/" className="gradient-text font-semibold">
            iConfess
          </Link>
          <span>/</span>
          <span>{title}</span>
        </div>

        <section className="glass rounded-3xl p-6 sm:p-8 md:p-10">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl" style={{ color: "#f0eeff" }}>
              {title}
            </h1>
            <p className="mt-4 text-sm leading-7 sm:text-base" style={{ color: "#9b98c8" }}>
              {description}
            </p>
          </div>
        </section>

        <section
          className="glass rounded-3xl p-6 sm:p-8 md:p-10 text-sm leading-7 sm:text-base"
          style={{ color: "#d9d6f8" }}
        >
          <div className="space-y-8">{children}</div>
        </section>

        <footer
          className="flex flex-col gap-4 border-t pt-6 text-sm sm:flex-row sm:items-center sm:justify-between"
          style={{ borderColor: "#1e1e3f", color: "#7b77a8" }}
        >
          <span>Need help? Email rocid003@gmail.com</span>
          <div className="flex flex-wrap gap-4">
            {legalLinks.map((link) => (
              <Link key={link.href} href={link.href} className="transition-colors hover:text-[#c084fc]">
                {link.label}
              </Link>
            ))}
          </div>
        </footer>
      </div>
    </main>
  );
}
