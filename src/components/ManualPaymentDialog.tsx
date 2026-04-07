"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { formatInr } from "@/lib/pricing";

type ManualPaymentDialogProps = {
  open: boolean;
  title: string;
  description: string;
  amount: number;
  pending?: boolean;
  submitLabel: string;
  onClose: () => void;
  onSubmit: (transactionReference: string) => Promise<void>;
};

const upiId = process.env.NEXT_PUBLIC_UPI_ID ?? "";
const payeeName = process.env.NEXT_PUBLIC_UPI_PAYEE ?? "iConfess";

export default function ManualPaymentDialog({
  open,
  title,
  description,
  amount,
  pending = false,
  submitLabel,
  onClose,
  onSubmit,
}: ManualPaymentDialogProps) {
  const [transactionReference, setTransactionReference] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const upiLink = useMemo(() => {
    if (!upiId) return null;

    const params = new URLSearchParams({
      pa: upiId,
      pn: payeeName,
      am: String(amount),
      cu: "INR",
      tn: title,
    });

    return `upi://pay?${params.toString()}`;
  }, [amount, title]);

  async function handleSubmit() {
    if (!transactionReference.trim()) {
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(transactionReference);
      setTransactionReference("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 overflow-y-auto px-4 pt-24 pb-4 sm:px-6 sm:pt-8 sm:pb-8"
          style={{ background: "rgba(102, 74, 44, 0.34)" }}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            className="mx-auto my-4 w-full max-w-xl rounded-3xl p-6 sm:my-0 sm:p-7"
            style={{ background: "linear-gradient(180deg, #fffaf3 0%, #f3e6d7 100%)", border: "1px solid rgba(184,159,126,0.3)" }}
          >
            <h2 className="text-xl font-semibold" style={{ color: "#3f2c1d" }}>
              {title}
            </h2>
            <p className="text-sm mt-3 leading-relaxed" style={{ color: "#735a43" }}>
              {description}
            </p>

            <div
              className="mt-4 rounded-2xl p-4 flex flex-col gap-3"
              style={{ background: "rgba(255,251,245,0.88)", border: "1px solid rgba(184,159,126,0.22)" }}
            >
              <p className="text-sm leading-relaxed" style={{ color: "#4a3521" }}>
                Amount to pay: <strong>{formatInr(amount)}</strong>
              </p>
              {upiId ? (
                <>
                  <p className="text-sm leading-relaxed" style={{ color: "#4a3521" }}>
                    Pay to UPI ID <strong>{upiId}</strong> under <strong>{payeeName}</strong>, then paste the UTR / reference number below.
                  </p>
                  {upiLink && (
                    <a
                      href={upiLink}
                      className="inline-flex items-center gap-2 text-sm font-medium w-fit"
                      style={{ color: "#8f6a46" }}
                    >
                      Open UPI app
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </>
              ) : (
                <p className="text-sm leading-relaxed" style={{ color: "#4a3521" }}>
                  Configure `NEXT_PUBLIC_UPI_ID` and `NEXT_PUBLIC_UPI_PAYEE` to show in-app payment instructions here.
                </p>
              )}
            </div>

            <label className="block mt-5">
              <span className="text-xs font-medium" style={{ color: "#9b7c5d" }}>
                UTR / Reference Number
              </span>
              <input
                type="text"
                value={transactionReference}
                onChange={(event) => setTransactionReference(event.target.value)}
                placeholder="Enter the UTR shown in your UPI app"
                className="mt-2 w-full px-4 py-3 rounded-xl text-sm border"
                style={{ background: "rgba(255,251,245,0.92)", borderColor: "rgba(184,159,126,0.35)", color: "#3f2c1d" }}
                disabled={pending || submitting}
              />
            </label>

            <p className="text-xs mt-3 leading-relaxed" style={{ color: "#9b7c5d" }}>
              Access is granted only after staff review marks the payment as successful.
            </p>

            <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: "rgba(255,251,245,0.9)", border: "1px solid rgba(184,159,126,0.3)", color: "#8c7257" }}
                disabled={submitting}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={pending || submitting || !transactionReference.trim()}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #8f6a46, #d7b892)" }}
              >
                {pending ? "Under Review" : submitting ? "Submitting..." : submitLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
