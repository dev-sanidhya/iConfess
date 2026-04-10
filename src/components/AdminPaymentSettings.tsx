"use client";

import { useState } from "react";
import Image from "next/image";
import { Save, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { formatInr, type PaymentCatalog } from "@/lib/pricing";
import { getErrorMessage, getResponseErrorMessage } from "@/lib/utils";

type AdminPaymentSettingsProps = {
  initialCatalog: PaymentCatalog;
};

type DraftState = Record<string, { amount: string; qrCodeDataUrl: string | null }>;

function buildDraftState(catalog: PaymentCatalog): DraftState {
  return Object.fromEntries(
    catalog.services.map((service) => [
      service.service,
      { amount: String(service.amount), qrCodeDataUrl: service.qrCodeDataUrl },
    ])
  );
}

export default function AdminPaymentSettings({ initialCatalog }: AdminPaymentSettingsProps) {
  const [catalog, setCatalog] = useState(initialCatalog);
  const [drafts, setDrafts] = useState<DraftState>(() => buildDraftState(initialCatalog));
  const [savingService, setSavingService] = useState<string | null>(null);

  async function handleFileChange(service: string, file: File | null) {
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file for the QR code.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Please keep the QR image under 2 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      setDrafts((current) => ({
        ...current,
        [service]: {
          ...current[service],
          qrCodeDataUrl: result,
        },
      }));
    };
    reader.readAsDataURL(file);
  }

  async function handleSave(service: string) {
    const draft = drafts[service];
    if (!draft) {
      return;
    }

    setSavingService(service);
    try {
      const res = await fetch("/api/internal/payment-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service,
          amount: draft.amount,
          qrCodeDataUrl: draft.qrCodeDataUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(getResponseErrorMessage(data, "Failed to update payment settings"));
      }

      setCatalog(data as PaymentCatalog);
      setDrafts(buildDraftState(data as PaymentCatalog));
      toast.success("Payment setting updated.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to update payment settings"));
    } finally {
      setSavingService(null);
    }
  }

  return (
    <section className="glass rounded-3xl p-5 sm:p-6">
      <div className="flex flex-col gap-2 mb-5">
        <h2 className="text-2xl font-semibold" style={{ color: "#3f2c1d" }}>Payment Settings</h2>
        <p className="text-sm" style={{ color: "#735a43" }}>
          Update the amount charged for each service and upload the QR code that should appear in the payment popup.
        </p>
      </div>

      <div className="grid gap-4">
        {catalog.services.map((service) => {
          const draft = drafts[service.service];
          const isSaving = savingService === service.service;

          return (
            <div
              key={service.service}
              className="rounded-2xl p-5"
              style={{ background: "rgba(255,251,245,0.88)", border: "1px solid rgba(184,159,126,0.22)" }}
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs uppercase tracking-[0.14em]" style={{ color: "#9b7c5d" }}>
                    {service.service.replaceAll("_", " ")}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold" style={{ color: "#3f2c1d" }}>
                    {service.label}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: "#735a43" }}>
                    {service.description}
                  </p>
                  <p className="mt-3 text-sm" style={{ color: "#8f6a46" }}>
                    Current amount: {formatInr(service.amount)}
                  </p>

                  <label className="mt-4 block">
                    <span className="text-xs font-medium" style={{ color: "#9b7c5d" }}>
                      Amount
                    </span>
                    <input
                      type="number"
                      min={1}
                      value={draft?.amount ?? ""}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [service.service]: {
                            ...current[service.service],
                            amount: event.target.value,
                          },
                        }))
                      }
                      className="mt-2 w-full max-w-xs rounded-xl border px-4 py-3 text-sm"
                      style={{
                        background: "rgba(255,251,245,0.92)",
                        borderColor: "rgba(184,159,126,0.35)",
                        color: "#3f2c1d",
                      }}
                    />
                  </label>
                </div>

                <div className="w-full lg:max-w-xs">
                  <div
                    className="rounded-2xl p-4"
                    style={{ background: "rgba(255,255,255,0.55)", border: "1px solid rgba(184,159,126,0.22)" }}
                  >
                    <p className="text-xs font-medium mb-3" style={{ color: "#9b7c5d" }}>
                      QR Code
                    </p>
                    {draft?.qrCodeDataUrl ? (
                      <div className="flex flex-col items-center gap-3">
                        <div className="overflow-hidden rounded-2xl border bg-white p-2" style={{ borderColor: "rgba(184,159,126,0.3)" }}>
                          <Image
                            src={draft.qrCodeDataUrl}
                            alt={`${service.label} QR`}
                            width={180}
                            height={180}
                            unoptimized
                            className="h-[180px] w-[180px] rounded-xl object-contain"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setDrafts((current) => ({
                              ...current,
                              [service.service]: {
                                ...current[service.service],
                                qrCodeDataUrl: null,
                              },
                            }))
                          }
                          className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium"
                          style={{
                            background: "rgba(220,38,38,0.08)",
                            border: "1px solid rgba(220,38,38,0.16)",
                            color: "#b91c1c",
                          }}
                        >
                          <X className="h-3.5 w-3.5" />
                          Remove QR
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm leading-relaxed" style={{ color: "#735a43" }}>
                        No QR uploaded yet.
                      </p>
                    )}

                    <label
                      className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium"
                      style={{
                        background: "rgba(143,106,70,0.12)",
                        border: "1px solid rgba(179,148,111,0.24)",
                        color: "#8f6a46",
                      }}
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Upload QR
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => void handleFileChange(service.service, event.target.files?.[0] ?? null)}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => void handleSave(service.service)}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #8f6a46, #d7b892)" }}
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
