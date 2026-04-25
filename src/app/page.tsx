import Link from "next/link";
import { Playfair_Display } from "next/font/google";
import { ArrowRight, Heart, Lock, Zap } from "lucide-react";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
});

const features = [
  {
    icon: Lock,
    title: "Completely Anonymous",
    description: "Your identity stays hidden. Always. We never reveal who sent the confession.",
  },
  {
    icon: Heart,
    title: "Mutual Magic",
    description: "If feelings are mutual, we let both of you know - and only reveal if you both agree.",
  },
  {
    icon: Zap,
    title: "Smart Matching",
    description: "Describe where you met them. We find them in our network and deliver your words.",
  },
];

const footerLinks = [
  { href: "/pricing", label: "Pricing" },
  { href: "/terms-and-conditions", label: "Terms & Conditions" },
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/refund-and-cancellation", label: "Refund Policy" },
  { href: "/contact", label: "Contact" },
];

export default function LandingPage() {
  return (
    <main className="relative flex min-h-screen w-full flex-col items-center overflow-x-hidden px-4">
      <div className="absolute inset-0 bg-[#f8f1e7]" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at top right, rgba(214,185,150,0.42) 0%, transparent 34%), radial-gradient(circle at 15% 22%, rgba(255,255,255,0.82) 0%, transparent 28%), linear-gradient(180deg, #fbf6ef 0%, #f3e7d7 48%, #efe0cd 100%)",
        }}
      />
      <div
        className="absolute inset-x-0 top-0 h-[420px]"
        style={{
          background: "linear-gradient(180deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 100%)",
        }}
      />

      <div className="relative z-10 flex w-full flex-col items-center">
        <nav className="flex w-full max-w-6xl items-center justify-between gap-3 py-5 sm:py-6">
          <span
            className="lp-fade-in flex-shrink-0 text-lg font-semibold tracking-[0.18em] uppercase sm:text-xl"
            style={{ color: "#805f3e" }}
          >
            iConfess
          </span>
          <div className="lp-fade-in lp-delay-1 flex items-center gap-2 sm:gap-3">
            <Link
              href="/auth/login"
              className="whitespace-nowrap px-3 py-2 text-sm transition-colors sm:px-4"
              style={{ color: "#80664c" }}
            >
              Sign In
            </Link>
            <Link
              href="/auth/register"
              className="whitespace-nowrap rounded-lg border px-3 py-2 text-sm transition-all sm:px-4"
              style={{
                border: "1px solid rgba(142, 112, 77, 0.34)",
                background: "rgba(255,255,255,0.5)",
                boxShadow: "0 12px 30px rgba(133, 103, 70, 0.08)",
                color: "#6f5234",
              }}
            >
              Get Started
            </Link>
          </div>
        </nav>

        <section className="mt-16 mb-20 flex max-w-3xl flex-col items-center text-center sm:mt-24 sm:mb-32">
          <div
            className="lp-fade-up mb-6 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] sm:mb-8 sm:text-xs"
            style={{
              border: "1px solid rgba(166, 132, 94, 0.24)",
              background: "rgba(255,255,255,0.62)",
              color: "#8a6a4a",
              boxShadow: "0 10px 30px rgba(133, 103, 70, 0.08)",
            }}
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: "#b38b5d" }} />
            Now live on college campuses
          </div>

          <h1
            className={`${playfair.className} lp-fade-up lp-delay-1 mb-5 text-4xl font-semibold leading-[0.98] tracking-tight sm:mb-6 sm:text-5xl md:text-7xl`}
            style={{ color: "#3f2c1d" }}
          >
            What if they <span style={{ color: "#9e7349" }}>feel</span>
            <br />
            the <span style={{ color: "#9e7349" }}>same?</span>
          </h1>

          <p className="lp-fade-up lp-delay-2 mb-8 max-w-xl px-1 text-base leading-relaxed sm:mb-10 sm:text-lg" style={{ color: "#735a43" }}>
            Tell them how you really feel. We find them, deliver your message, and keep your identity hidden unless
            it&apos;s a match.
          </p>

          <div className="lp-fade-up lp-delay-3 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:gap-4">
            <Link
              href="/auth/register"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 sm:w-auto"
              style={{
                background: "linear-gradient(135deg, #8f6a46 0%, #b69068 55%, #d7b892 100%)",
                boxShadow: "0 20px 40px rgba(143, 106, 70, 0.22)",
              }}
            >
              Send a Confession
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border px-6 py-3 text-sm font-medium transition-colors hover:bg-white/40 sm:w-auto"
              style={{
                color: "#735a43",
                borderColor: "rgba(142, 112, 77, 0.28)",
                background: "rgba(255,255,255,0.38)",
              }}
            >
              Read Mine
            </Link>
          </div>
        </section>

        <section className="lp-fade-up lp-delay-4 relative mb-20 flex w-full max-w-lg justify-center px-2 sm:mb-32 sm:px-0">
          <div
            className="absolute inset-x-6 -top-3 h-full rounded-2xl"
            style={{
              background: "rgba(235, 223, 208, 0.6)",
              border: "1px solid rgba(179, 148, 111, 0.24)",
            }}
          />
          <div
            className="absolute inset-x-3 -top-1.5 h-full rounded-2xl"
            style={{
              background: "rgba(247, 240, 230, 0.86)",
              border: "1px solid rgba(179, 148, 111, 0.28)",
            }}
          />
          <article
            className="lp-card-float relative w-full max-w-[420px] overflow-hidden rounded-2xl p-5 sm:p-6"
            style={{
              background: "linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(247,239,228,0.92) 100%)",
              border: "1px solid rgba(179, 148, 111, 0.3)",
              boxShadow: "0 28px 70px rgba(123, 95, 63, 0.14)",
            }}
          >
            <div className="mb-4 flex items-center justify-between text-xs" style={{ color: "#8f6a46" }}>
              <span>To: Someone special</span>
              <span className="rounded-full px-2 py-1" style={{ background: "rgba(143,106,70,0.14)" }}>
                Anonymous
              </span>
            </div>
            <p className={`${playfair.className} mb-3 text-xl sm:text-2xl`} style={{ color: "#493321" }}>
              I still think about you
            </p>
            <p className="text-sm leading-relaxed" style={{ color: "#735a43" }}>
              We met in the hallway by the old library, and I have wanted to say this for months.
            </p>
            <div className="mt-6 space-y-2">
              <div className="h-2 rounded-full" style={{ width: "70%", background: "rgba(143,106,70,0.16)" }} />
              <div className="h-2 rounded-full" style={{ width: "88%", background: "rgba(143,106,70,0.12)" }} />
              <div
                className="h-2 animate-pulse rounded-full"
                style={{ width: "60%", background: "rgba(143,106,70,0.24)" }}
              />
            </div>
          </article>
        </section>

        <section className="mb-20 w-full max-w-4xl sm:mb-32">
          <h2
            className={`${playfair.className} lp-fade-up mb-8 text-center text-2xl font-semibold sm:mb-12 sm:text-3xl`}
            style={{ color: "#3f2c1d" }}
          >
            How it <span style={{ color: "#9e7349" }}>works</span>
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-3">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="lp-feature-reveal rounded-2xl p-6 transition-transform hover:-translate-y-0.5"
                style={{
                  background: "linear-gradient(180deg, rgba(255,255,255,0.78) 0%, rgba(250,242,232,0.88) 100%)",
                  border: "1px solid rgba(179, 148, 111, 0.22)",
                  boxShadow: "0 24px 50px rgba(123, 95, 63, 0.08)",
                  backdropFilter: "blur(18px)",
                  animationDelay: `${0.12 + i * 0.09}s`,
                }}
              >
                <div
                  className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{
                    background: "rgba(179, 148, 111, 0.12)",
                    border: "1px solid rgba(179, 148, 111, 0.22)",
                  }}
                >
                  <f.icon className="h-5 w-5" style={{ color: "#8f6a46" }} />
                </div>
                <h3 className={`${playfair.className} mb-2 text-xl font-semibold`} style={{ color: "#493321" }}>
                  {f.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "#735a43" }}>
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <footer
          className="flex w-full max-w-6xl flex-col gap-4 py-8 text-center text-xs sm:text-left"
          style={{ borderTop: "1px solid rgba(179, 148, 111, 0.22)", color: "#8a6a4a" }}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className={`${playfair.className} font-semibold`} style={{ color: "#805f3e" }}>
              iConfess
            </span>
            <span>Anonymous. Private. Yours.</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:justify-start">
            {footerLinks.map((link) => (
              <Link key={link.href} href={link.href} className="transition-colors hover:text-[#6f5234]">
                {link.label}
              </Link>
            ))}
            <a href="mailto:ciarocid01@gmail.com" className="transition-colors hover:text-[#6f5234]">
              ciarocid01@gmail.com
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}
