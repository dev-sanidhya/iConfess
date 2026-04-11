"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";

export default function TransactionIdCopyButton({ value }: { value: string }) {
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Transaction ID copied");
    } catch {
      toast.error("Failed to copy transaction ID");
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      className="inline-flex items-center justify-center rounded-lg p-2"
      style={{
        background: "rgba(143,106,70,0.1)",
        border: "1px solid rgba(179,148,111,0.24)",
        color: "#8f6a46",
      }}
      aria-label={`Copy transaction ID ${value}`}
      title="Copy transaction ID"
    >
      <Copy className="h-4 w-4" />
    </button>
  );
}
