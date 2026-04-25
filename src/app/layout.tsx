import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import DeferredToaster from "@/components/DeferredToaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "iConfess - Anonymous Confessions",
  description: "Tell someone how you feel. Anonymously.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="relative flex min-h-full flex-col" style={{ background: "#f7efe4" }}>
        <div className="relative z-10 flex min-h-screen flex-col">{children}</div>
        <DeferredToaster />
      </body>
    </html>
  );
}
