"use client";

import dynamic from "next/dynamic";

const AbstractBackground = dynamic(() => import("@/components/remotion/AbstractBackground"), { ssr: false });

export default function DashboardBackground() {
  return <AbstractBackground />;
}
