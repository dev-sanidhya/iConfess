"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getDefaultPaymentCatalog, type PaymentCatalog } from "@/lib/pricing";

const PaymentCatalogContext = createContext<PaymentCatalog>(getDefaultPaymentCatalog());

export function PaymentCatalogProvider({
  initialCatalog,
  children,
}: {
  initialCatalog: PaymentCatalog;
  children: React.ReactNode;
}) {
  const [catalog, setCatalog] = useState<PaymentCatalog>(initialCatalog);

  useEffect(() => {
    setCatalog(initialCatalog);
  }, [initialCatalog]);

  useEffect(() => {
    let cancelled = false;

    async function loadCatalog() {
      try {
        const res = await fetch("/api/payment-config", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok || cancelled) {
          return;
        }

        setCatalog(data as PaymentCatalog);
      } catch {
        // Keep the server-provided catalog when refresh fails.
      }
    }

    void loadCatalog();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PaymentCatalogContext.Provider value={catalog}>
      {children}
    </PaymentCatalogContext.Provider>
  );
}

export function usePaymentCatalogContext() {
  return useContext(PaymentCatalogContext);
}
