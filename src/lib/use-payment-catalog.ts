"use client";

import { usePaymentCatalogContext } from "@/components/PaymentCatalogProvider";

export function usePaymentCatalog() {
  return usePaymentCatalogContext();
}
