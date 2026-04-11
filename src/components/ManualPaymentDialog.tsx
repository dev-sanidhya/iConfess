"use client";

import Image from "next/image";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, QrCode } from "lucide-react";
import { formatInr } from "@/lib/pricing";

type ManualPaymentDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  amount: number;
  qrCodeDataUrl?: string | null;
  pending?: boolean;
  submitLabel: string;
  onClose: () => void;
  onSubmit: (transactionReference: string) => Promise<void>;
};

export default function ManualPaymentDialog({
  open,
  title,
  amount,
  qrCodeDataUrl = null,
  pending = false,
  submitLabel,
  onClose,
  onSubmit,
}: ManualPaymentDialogProps) {
  const [transactionReference, setTransactionReference] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

            <div
              className="mt-4 rounded-2xl p-4 flex flex-col gap-3"
              style={{ background: "rgba(255,251,245,0.88)", border: "1px solid rgba(184,159,126,0.22)" }}
            >
              <p className="text-sm leading-relaxed" style={{ color: "#4a3521" }}>
                Amount to pay: <strong>{formatInr(amount)}</strong>
              </p>
              {qrCodeDataUrl ? (
                <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.55)", border: "1px solid rgba(184,159,126,0.22)" }}>
                  <div className="flex flex-col items-center gap-3">
                    <div className="overflow-hidden rounded-2xl border bg-white p-2" style={{ borderColor: "rgba(184,159,126,0.3)" }}>
                      <Image
                        src={qrCodeDataUrl}
                        alt={`${title} payment QR code`}
                        width={220}
                        height={220}
                        unoptimized
                        className="h-[220px] w-[220px] rounded-xl object-contain"
                      />
                    </div>
                    <a
                      href={qrCodeDataUrl}
                      download={`${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-qr.png`}
                      className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium"
                      style={{
                        background: "rgba(143,106,70,0.12)",
                        border: "1px solid rgba(179,148,111,0.24)",
                        color: "#8f6a46",
                      }}
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download QR
                    </a>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.55)", border: "1px dashed rgba(184,159,126,0.35)" }}>
                  <QrCode className="mt-0.5 h-5 w-5 shrink-0" style={{ color: "#8f6a46" }} />
                  <p className="text-sm leading-relaxed" style={{ color: "#4a3521" }}>
                    QR code is not available for this service yet. Please ask the admin to upload one before taking payment.
                  </p>
                </div>
              )}
              <p className="text-sm leading-relaxed" style={{ color: "#4a3521" }}>
                Download the QR code and make payment through it and then paste the UTR/Reference ID/Transaction ID here.
              </p>
            </div>

            <label className="block mt-5">
              <span className="text-xs font-medium" style={{ color: "#9b7c5d" }}>
                UTR / Reference ID / Transaction ID
              </span>
              <input
                type="text"
                value={transactionReference}
                onChange={(event) => setTransactionReference(event.target.value)}
                placeholder="Enter the UTR / Reference ID / Transaction ID"
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
