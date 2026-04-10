"use client";

import { useEffect, useState } from "react";
import { getDefaultPaymentCatalog, type PaymentCatalog } from "@/lib/pricing";

export function usePaymentCatalog() {
  const [catalog, setCatalog] = useState<PaymentCatalog>(() => getDefaultPaymentCatalog());

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
        // Keep the baked-in fallback catalog when the request fails.
      }
    }

    void loadCatalog();

    return () => {
      cancelled = true;
    };
  }, []);

  return catalog;
}
