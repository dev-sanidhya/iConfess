import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ActivityTracker from "@/components/ActivityTracker";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "iConfess — Anonymous Confessions",
  description: "Tell someone how you feel. Anonymously.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col relative" style={{ background: "#05050f" }}>
        <ActivityTracker />
        {/* Ambient background glows */}
        <div
          className="ambient-glow"
          style={{
            width: 700,
            height: 700,
            background: "radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)",
            top: -250,
            right: -250,
          }}
        />
        <div
          className="ambient-glow"
          style={{
            width: 500,
            height: 500,
            background: "radial-gradient(circle, rgba(244,114,182,0.08) 0%, transparent 70%)",
            bottom: -100,
            left: -100,
          }}
        />
        <div className="relative z-10 flex flex-col min-h-screen">
          {children}
        </div>
        <Toaster
          theme="dark"
          toastOptions={{
            style: {
              background: "#0d0d1f",
              border: "1px solid #1e1e3f",
              color: "#f0eeff",
            },
          }}
        />
      </body>
    </html>
  );
}
