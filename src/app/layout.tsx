import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ActivityTracker from "@/components/ActivityTracker";
import { PaymentCatalogProvider } from "@/components/PaymentCatalogProvider";
import { Toaster } from "@/components/ui/sonner";
import { getPaymentCatalog } from "@/lib/payment-catalog.server";

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

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const paymentCatalog = await getPaymentCatalog();

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col relative" style={{ background: "#f7efe4" }}>
        <PaymentCatalogProvider initialCatalog={paymentCatalog}>
          <ActivityTracker />
          {/* Ambient background glows */}
          <div
            className="ambient-glow"
            style={{
              width: 700,
              height: 700,
              background: "radial-gradient(circle, rgba(214,185,150,0.26) 0%, transparent 70%)",
              top: -250,
              right: -250,
            }}
          />
          <div
            className="ambient-glow"
            style={{
              width: 500,
              height: 500,
              background: "radial-gradient(circle, rgba(255,255,255,0.34) 0%, transparent 70%)",
              bottom: -100,
              left: -100,
            }}
          />
          <div className="relative z-10 flex flex-col min-h-screen">
            {children}
          </div>
          <Toaster
            theme="light"
            toastOptions={{
              style: {
                background: "rgba(255, 250, 243, 0.96)",
                border: "1px solid rgba(179, 148, 111, 0.32)",
                color: "#4a3521",
              },
            }}
          />
        </PaymentCatalogProvider>
      </body>
    </html>
  );
}
