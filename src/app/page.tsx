"use client";

import { motion, Variants } from "framer-motion";
import dynamic from "next/dynamic";
import { Playfair_Display } from "next/font/google";
import Link from "next/link";
import { ArrowRight, Heart, Lock, Zap } from "lucide-react";

const AbstractBackground = dynamic(() => import("@/components/remotion/AbstractBackground"), { ssr: false });
const ConfessionPlayer = dynamic(() => import("@/components/remotion/ConfessionPlayer"), { ssr: false });
const playfair = Playfair_Display({ subsets: ["latin"], weight: ["600", "700"] });

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.6 },
  }),
};

const features = [
  {
    icon: Lock,
    title: "Completely Anonymous",
    description: "Your identity stays hidden. Always. We never reveal who sent the confession.",
  },
  {
    icon: Heart,
    title: "Mutual Magic",
    description:
      "If feelings are mutual, we let both of you know — and only reveal if you both agree.",
  },
  {
    icon: Zap,
    title: "Smart Matching",
    description:
      "Describe where you met them. We find them in our network and deliver your words.",
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
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 100%)",
        }}
      />
      <AbstractBackground variant="light" />
      <div className="relative z-10 flex w-full flex-col items-center">
      {/* Nav */}
      <nav className="w-full max-w-6xl flex items-center justify-between gap-3 py-5 sm:py-6">
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex-shrink-0 text-lg font-semibold tracking-[0.18em] uppercase sm:text-xl"
          style={{ color: "#805f3e" }}
        >
          iConfess
        </motion.span>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex items-center gap-2 sm:gap-3"
        >
          <Link
            href="/auth/login"
            className="px-3 sm:px-4 py-2 text-sm transition-colors whitespace-nowrap"
            style={{ color: "#80664c" }}
          >
            Sign In
          </Link>
          <Link
            href="/auth/register"
            className="px-3 sm:px-4 py-2 text-sm rounded-lg border transition-all whitespace-nowrap"
            style={{
              border: "1px solid rgba(142, 112, 77, 0.34)",
              background: "rgba(255,255,255,0.5)",
              boxShadow: "0 12px 30px rgba(133, 103, 70, 0.08)",
              color: "#6f5234",
            }}
          >
            Get Started
          </Link>
        </motion.div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center text-center mt-16 sm:mt-24 mb-20 sm:mb-32 max-w-3xl">
        <motion.div
          custom={0}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] sm:text-xs mb-6 sm:mb-8"
          style={{
            border: "1px solid rgba(166, 132, 94, 0.24)",
            background: "rgba(255,255,255,0.62)",
            color: "#8a6a4a",
            boxShadow: "0 10px 30px rgba(133, 103, 70, 0.08)",
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#b38b5d" }} />
          Now live on college campuses
        </motion.div>

        <motion.h1
          custom={1}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className={`${playfair.className} text-4xl sm:text-5xl md:text-7xl font-semibold tracking-tight leading-[0.98] mb-5 sm:mb-6`}
          style={{ color: "#3f2c1d" }}
        >
          What if they{" "}
          <span style={{ color: "#9e7349" }}>feel</span>
          <br />
          the{" "}
          <span style={{ color: "#9e7349" }}>same?</span>
        </motion.h1>

        <motion.p
          custom={2}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="text-base sm:text-lg leading-relaxed mb-8 sm:mb-10 max-w-xl px-1"
          style={{ color: "#735a43" }}
        >
          Tell them how you really feel. We find them, deliver your message,
          and keep your identity hidden unless it&apos;s a match.
        </motion.p>

        <motion.div
          custom={3}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto"
        >
          <Link
            href="/auth/register"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 sm:hover:scale-105 w-full sm:w-auto"
            style={{
              background: "linear-gradient(135deg, #8f6a46 0%, #b69068 55%, #d7b892 100%)",
              boxShadow: "0 20px 40px rgba(143, 106, 70, 0.22)",
            }}
          >
            Send a Confession
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all hover:border-[#c084fc]/30 w-full sm:w-auto"
            style={{
              color: "#735a43",
              border: "1px solid rgba(142, 112, 77, 0.28)",
              background: "rgba(255,255,255,0.38)",
            }}
          >
            Read Mine
          </Link>
        </motion.div>
      </section>

      {/* Remotion animated confession preview */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.8 }}
        className="relative w-full max-w-lg mb-20 sm:mb-32 flex justify-center px-2 sm:px-0"
      >
        {/* Stacked ghost cards behind */}
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
        <ConfessionPlayer variant="light" />
      </motion.div>

      {/* Features */}
      <section className="w-full max-w-4xl mb-20 sm:mb-32">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className={`${playfair.className} text-2xl sm:text-3xl font-semibold text-center mb-8 sm:mb-12`}
          style={{ color: "#3f2c1d" }}
        >
          How it <span style={{ color: "#9e7349" }}>works</span>
        </motion.h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
              className="rounded-2xl p-6"
              style={{
                background: "linear-gradient(180deg, rgba(255,255,255,0.78) 0%, rgba(250,242,232,0.88) 100%)",
                border: "1px solid rgba(179, 148, 111, 0.22)",
                boxShadow: "0 24px 50px rgba(123, 95, 63, 0.08)",
                backdropFilter: "blur(18px)",
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{
                  background: "rgba(179, 148, 111, 0.12)",
                  border: "1px solid rgba(179, 148, 111, 0.22)",
                }}
              >
                <f.icon className="w-5 h-5" style={{ color: "#8f6a46" }} />
              </div>
              <h3 className={`${playfair.className} mb-2 text-xl font-semibold`} style={{ color: "#493321" }}>
                {f.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "#735a43" }}>
                {f.description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer
        className="w-full max-w-6xl py-8 flex flex-col gap-4 text-xs text-center sm:text-left"
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
