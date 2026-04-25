"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const LazyToaster = dynamic(
  () => import("@/components/ui/sonner").then((mod) => mod.Toaster),
  { ssr: false },
);

export default function DeferredToaster() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let idleId: number | null = null;

    const activate = () => {
      if (!cancelled) {
        setReady(true);
      }
    };

    if (typeof window.requestIdleCallback === "function") {
      idleId = window.requestIdleCallback(activate, { timeout: 1200 });
    } else {
      timeoutId = setTimeout(activate, 450);
    }

    return () => {
      cancelled = true;
      if (idleId !== null && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  if (!ready) {
    return null;
  }

  return (
    <LazyToaster
      theme="light"
      toastOptions={{
        style: {
          background: "rgba(255, 250, 243, 0.96)",
          border: "1px solid rgba(179, 148, 111, 0.32)",
          color: "#4a3521",
        },
      }}
    />
  );
}
