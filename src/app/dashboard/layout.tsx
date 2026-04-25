import { redirect } from "next/navigation";
import DashboardNav from "@/components/DashboardNav";
import DashboardBackground from "@/components/DashboardBackground";
import ActivityTracker from "@/components/ActivityTracker";
import { PaymentCatalogProvider } from "@/components/PaymentCatalogProvider";
import { getSession } from "@/lib/auth";
import { getPaymentCatalog } from "@/lib/payment-catalog.server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user) redirect("/auth/login");

  const paymentCatalog = await getPaymentCatalog();

  return (
    <PaymentCatalogProvider initialCatalog={paymentCatalog}>
      <ActivityTracker />
      <div className="flex min-h-screen">
        <DashboardBackground />
        <DashboardNav user={{ id: user.id, name: user.name, publicCode: user.publicCode }} />
        <main className="relative z-10 w-full max-w-5xl flex-1 px-4 pt-20 pb-8 sm:px-6 md:ml-64 md:px-8 md:pt-0">
          {children}
        </main>
      </div>
    </PaymentCatalogProvider>
  );
}
