"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const STORAGE_KEY = "iconfess-anonymous-id";

function getAnonymousId() {
  if (typeof window === "undefined") {
    return null;
  }

  const existing = window.localStorage.getItem(STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const created = crypto.randomUUID();
  window.localStorage.setItem(STORAGE_KEY, created);
  return created;
}

async function sendActivity(type: "CLICK" | "SCROLL", path: string, anonymousId: string | null) {
  try {
    await fetch("/api/internal/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, path, anonymousId }),
      keepalive: true,
    });
  } catch {
    // Ignore telemetry delivery failures
  }
}

export default function ActivityTracker() {
  const pathname = usePathname();
  const lastClickRef = useRef(0);
  const lastScrollRef = useRef(0);

  useEffect(() => {
    const anonymousId = getAnonymousId();

    function handleClick() {
      const now = Date.now();
      if (now - lastClickRef.current < 4000) {
        return;
      }

      lastClickRef.current = now;
      void sendActivity("CLICK", pathname, anonymousId);
    }

    function handleScroll() {
      const now = Date.now();
      if (now - lastScrollRef.current < 15000) {
        return;
      }

      lastScrollRef.current = now;
      void sendActivity("SCROLL", pathname, anonymousId);
    }

    window.addEventListener("click", handleClick, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("click", handleClick);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [pathname]);

  return null;
}
