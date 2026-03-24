"use client";

import { motion, Variants } from "framer-motion";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight, Heart, Lock, Zap } from "lucide-react";

const AbstractBackground = dynamic(() => import("@/components/remotion/AbstractBackground"), { ssr: false });
const ConfessionPlayer = dynamic(() => import("@/components/remotion/ConfessionPlayer"), { ssr: false });

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

export default function LandingPage() {
  return (
    <main className="flex flex-col items-center min-h-screen px-4">
      <AbstractBackground />
      {/* Nav */}
      <nav className="w-full max-w-6xl flex items-center justify-between py-6">
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-xl font-semibold tracking-tight gradient-text"
        >
          iConfess
        </motion.span>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex gap-3"
        >
          <Link
            href="/auth/login"
            className="px-4 py-2 text-sm transition-colors"
            style={{ color: "#9b98c8" }}
          >
            Sign In
          </Link>
          <Link
            href="/auth/register"
            className="px-4 py-2 text-sm rounded-lg border transition-all"
            style={{
              border: "1px solid #1e1e3f",
              background: "#0d0d1f",
              color: "#c084fc",
            }}
          >
            Get Started
          </Link>
        </motion.div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center text-center mt-24 mb-32 max-w-3xl">
        <motion.div
          custom={0}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs mb-8"
          style={{ border: "1px solid #1e1e3f", background: "#0d0d1f", color: "#9b98c8" }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#c084fc] animate-pulse" />
          Now live on college campuses
        </motion.div>

        <motion.h1
          custom={1}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="text-6xl md:text-7xl font-bold tracking-tight leading-[1.05] mb-6"
          style={{ color: "#f0eeff" }}
        >
          Say what you{" "}
          <span className="gradient-text">feel</span>
          <br />
          without the{" "}
          <span className="gradient-text">fear</span>
        </motion.h1>

        <motion.p
          custom={2}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="text-lg leading-relaxed mb-10 max-w-xl"
          style={{ color: "#9b98c8" }}
        >
          Confess your feelings to someone you&apos;ve noticed. We find them, deliver your words,
          and keep your identity completely hidden.
        </motion.p>

        <motion.div
          custom={3}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="flex gap-4"
        >
          <Link
            href="/auth/register"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 hover:scale-105"
            style={{
              background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #c084fc 100%)",
            }}
          >
            Send a Confession
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all hover:border-[#c084fc]/30"
            style={{
              color: "#9b98c8",
              border: "1px solid #1e1e3f",
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
        className="relative w-full max-w-lg mb-32 flex justify-center"
      >
        {/* Stacked ghost cards behind */}
        <div
          className="absolute inset-x-6 -top-3 h-full rounded-2xl"
          style={{ background: "rgba(18,18,42,0.4)", border: "1px solid rgba(30,30,63,0.4)" }}
        />
        <div
          className="absolute inset-x-3 -top-1.5 h-full rounded-2xl"
          style={{ background: "rgba(13,13,31,0.6)", border: "1px solid rgba(30,30,63,0.5)" }}
        />
        <ConfessionPlayer />
      </motion.div>

      {/* Features */}
      <section className="w-full max-w-4xl mb-32">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-3xl font-bold text-center mb-12"
          style={{ color: "#f0eeff" }}
        >
          How it <span className="gradient-text">works</span>
        </motion.h2>
        <div className="grid md:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
              className="glass glass-hover rounded-2xl p-6"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{
                  background: "rgba(124,58,237,0.15)",
                  border: "1px solid rgba(124,58,237,0.2)",
                }}
              >
                <f.icon className="w-5 h-5" style={{ color: "#c084fc" }} />
              </div>
              <h3 className="font-semibold mb-2" style={{ color: "#f0eeff" }}>
                {f.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "#9b98c8" }}>
                {f.description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer
        className="w-full max-w-6xl py-8 flex items-center justify-between text-xs"
        style={{ borderTop: "1px solid #1e1e3f", color: "#4a4870" }}
      >
        <span className="gradient-text font-semibold">iConfess</span>
        <span>Anonymous. Private. Yours.</span>
      </footer>
    </main>
  );
}
