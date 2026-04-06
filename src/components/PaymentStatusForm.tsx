"use client";

import { useTransition } from "react";
import { PaymentStatus } from "@prisma/client";
import { toast } from "sonner";

export default function PaymentStatusForm({ paymentId, status }: { paymentId: string; status: PaymentStatus }) {
  const [pending, startTransition] = useTransition();

  function handleChange(nextStatus: PaymentStatus) {
    startTransition(async () => {
      try {
        const response = await fetch("/api/internal/payments", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: paymentId, status: nextStatus }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error);
        }

        toast.success("Payment status updated");
        window.location.reload();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to update payment");
      }
    });
  }

  return (
    <select
      value={status}
      onChange={(event) => handleChange(event.target.value as PaymentStatus)}
      disabled={pending}
      className="px-3 py-2 rounded-xl text-xs border"
      style={{ background: "rgba(30,30,63,0.5)", borderColor: "#1e1e3f", color: "#f0eeff" }}
    >
      {Object.values(PaymentStatus).map((option) => (
        <option key={option} value={option}>{option}</option>
      ))}
    </select>
  );
}
