"use client";

import { useEffect, useState, useTransition } from "react";
import { Download, Minus, Plus, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import {
  formatNotificationTimestamp,
  NOTIFICATION_AUDIENCE_OPTIONS,
  type NotificationAudienceCategory,
  type NotificationAudienceRow,
  type NotificationExportColumn,
} from "@/lib/internal-notifications";

const ALL_COLUMNS: Array<{ value: NotificationExportColumn; label: string }> = [
  { value: "name", label: "Name" },
  { value: "phone", label: "Phone number" },
  { value: "count", label: "Count" },
  { value: "lastChangedAt", label: "Time & date changed" },
];

export default function AdminNotificationsPanel({
  initialCategory,
  initialRows,
}: {
  initialCategory: NotificationAudienceCategory;
  initialRows: NotificationAudienceRow[];
}) {
  const [category, setCategory] = useState(initialCategory);
  const [rows, setRows] = useState(initialRows);
  const [countFilterMode, setCountFilterMode] = useState<"all" | "exact">("all");
  const [countFilterValue, setCountFilterValue] = useState("");
  const [countStep, setCountStep] = useState("1");
  const [documentType, setDocumentType] = useState("pdf");
  const [selectedColumns, setSelectedColumns] = useState<NotificationExportColumn[]>(["name", "phone", "count", "lastChangedAt"]);
  const [refreshToken, setRefreshToken] = useState(0);
  const [isLoadingRows, startRowsTransition] = useTransition();
  const [isUpdatingCount, startCountTransition] = useTransition();
  const [isDownloading, startDownloadTransition] = useTransition();

  const normalizedCountFilter =
    countFilterMode === "all" || countFilterValue.trim() === "" ? "all" : countFilterValue.trim();

  useEffect(() => {
    startRowsTransition(async () => {
      try {
        const query = new URLSearchParams({ category });
        if (normalizedCountFilter !== "all") {
          query.set("countFilter", normalizedCountFilter);
        }

        const response = await fetch(`/api/internal/notifications?${query.toString()}`, {
          method: "GET",
          cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(typeof data.error === "string" ? data.error : "Failed to load notification list");
        }

        setRows(Array.isArray(data.rows) ? data.rows : []);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load notification list");
      }
    });
  }, [category, normalizedCountFilter, refreshToken]);

  const totalPendingItems = rows.reduce((sum, row) => sum + row.pendingItems, 0);

  function toggleColumn(column: NotificationExportColumn) {
    setSelectedColumns((current) => {
      if (current.includes(column)) {
        if (current.length === 1) {
          return current;
        }

        return current.filter((entry) => entry !== column);
      }

      return [...current, column];
    });
  }

  function applyCountDelta(deltaDirection: 1 | -1) {
    const parsedStep = Number.parseInt(countStep, 10);
    const step = Number.isFinite(parsedStep) && parsedStep > 0 ? parsedStep : 1;

    startCountTransition(async () => {
      try {
        const response = await fetch("/api/internal/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category,
            delta: step * deltaDirection,
            countFilter: normalizedCountFilter,
          }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(typeof data.error === "string" ? data.error : "Failed to update count");
        }

        setRows(Array.isArray(data.rows) ? data.rows : []);
        toast.success(`Count updated for ${Array.isArray(data.rows) ? data.rows.length : 0} records.`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to update count");
      }
    });
  }

  function handleDownload() {
    if (selectedColumns.length === 0) {
      toast.error("Select at least one column to export.");
      return;
    }

    startDownloadTransition(async () => {
      try {
        const response = await fetch("/api/internal/notifications/export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category,
            documentType,
            columns: selectedColumns,
            countFilter: normalizedCountFilter,
          }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(typeof data?.error === "string" ? data.error : "Failed to download document");
        }

        const blob = await response.blob();
        const disposition = response.headers.get("content-disposition") ?? "";
        const match = disposition.match(/filename=\"?([^"]+)\"?/i);
        const fileName = match?.[1] ?? `notifications.${documentType}`;
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to download document");
      }
    });
  }

  return (
    <div className="space-y-6 py-6">
      <section className="glass rounded-3xl p-5 sm:p-6">
        <h1 className="text-2xl font-semibold mb-2" style={{ color: "#3f2c1d" }}>Notification Export</h1>
        <p className="text-sm" style={{ color: "#735a43" }}>
          Filter the admin list by audience type, manually update the notification count for that entire filtered result, and export only the columns you need.
        </p>
      </section>

      <section className="glass rounded-3xl p-5 sm:p-6 space-y-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_220px_220px_220px]">
          <div className="flex flex-col gap-2">
            <label htmlFor="category" className="text-xs font-medium uppercase tracking-[0.14em]" style={{ color: "#9b7c5d" }}>
              Category
            </label>
            <select
              id="category"
              value={category}
              onChange={(event) => setCategory(event.target.value as NotificationAudienceCategory)}
              className="rounded-xl border px-4 py-2.5 text-sm"
              style={{ background: "rgba(255,251,245,0.92)", borderColor: "rgba(184,159,126,0.35)", color: "#3f2c1d" }}
            >
              {NOTIFICATION_AUDIENCE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <p className="text-xs" style={{ color: "#9b7c5d" }}>
              {NOTIFICATION_AUDIENCE_OPTIONS.find((option) => option.value === category)?.description}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="countFilterMode" className="text-xs font-medium uppercase tracking-[0.14em]" style={{ color: "#9b7c5d" }}>
              Count filter
            </label>
            <div className="grid gap-2 sm:grid-cols-[120px_minmax(0,1fr)]">
              <select
                id="countFilterMode"
                value={countFilterMode}
                onChange={(event) => setCountFilterMode(event.target.value as "all" | "exact")}
                className="rounded-xl border px-4 py-2.5 text-sm"
                style={{ background: "rgba(255,251,245,0.92)", borderColor: "rgba(184,159,126,0.35)", color: "#3f2c1d" }}
              >
                <option value="all">All</option>
                <option value="exact">Exact</option>
              </select>
              <input
                type="number"
                min={0}
                value={countFilterValue}
                onChange={(event) => setCountFilterValue(event.target.value)}
                placeholder="Enter count"
                disabled={countFilterMode === "all"}
                className="rounded-xl border px-4 py-2.5 text-sm disabled:opacity-60"
                style={{ background: "rgba(255,251,245,0.92)", borderColor: "rgba(184,159,126,0.35)", color: "#3f2c1d" }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="countStep" className="text-xs font-medium uppercase tracking-[0.14em]" style={{ color: "#9b7c5d" }}>
              Count step
            </label>
            <input
              id="countStep"
              type="number"
              min={1}
              value={countStep}
              onChange={(event) => setCountStep(event.target.value)}
              className="rounded-xl border px-4 py-2.5 text-sm"
              style={{ background: "rgba(255,251,245,0.92)", borderColor: "rgba(184,159,126,0.35)", color: "#3f2c1d" }}
            />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-[0.14em]" style={{ color: "#9b7c5d" }}>
              Apply to filtered list
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => applyCountDelta(-1)}
                disabled={isUpdatingCount || rows.length === 0}
                className="flex-1 rounded-xl px-4 py-2.5 text-sm font-medium"
                style={{ background: "rgba(255,251,245,0.92)", border: "1px solid rgba(184,159,126,0.35)", color: "#8f6a46" }}
              >
                <span className="inline-flex items-center gap-2">
                  <Minus className="h-4 w-4" />
                  Decrease
                </span>
              </button>
              <button
                type="button"
                onClick={() => applyCountDelta(1)}
                disabled={isUpdatingCount || rows.length === 0}
                className="flex-1 rounded-xl px-4 py-2.5 text-sm font-medium text-white"
                style={{ background: "linear-gradient(135deg, #8f6a46 0%, #d7b892 100%)" }}
              >
                <span className="inline-flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Increase
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl p-4" style={{ background: "rgba(255,251,245,0.88)", border: "1px solid rgba(184,159,126,0.22)" }}>
            <p className="text-xs uppercase tracking-[0.14em]" style={{ color: "#9b7c5d" }}>People in list</p>
            <p className="mt-2 text-2xl font-semibold" style={{ color: "#3f2c1d" }}>{rows.length}</p>
          </div>
          <div className="rounded-2xl p-4" style={{ background: "rgba(255,251,245,0.88)", border: "1px solid rgba(184,159,126,0.22)" }}>
            <p className="text-xs uppercase tracking-[0.14em]" style={{ color: "#9b7c5d" }}>Pending items</p>
            <p className="mt-2 text-2xl font-semibold" style={{ color: "#3f2c1d" }}>{totalPendingItems}</p>
          </div>
          <div className="rounded-2xl p-4" style={{ background: "rgba(255,251,245,0.88)", border: "1px solid rgba(184,159,126,0.22)" }}>
            <p className="text-xs uppercase tracking-[0.14em]" style={{ color: "#9b7c5d" }}>Status</p>
            <p className="mt-2 text-sm font-medium" style={{ color: "#3f2c1d" }}>
              {isLoadingRows ? "Refreshing list..." : isUpdatingCount ? "Updating counts..." : "Ready"}
            </p>
          </div>
        </div>
      </section>

      <section className="glass rounded-3xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium" style={{ color: "#3f2c1d" }}>Columns to include in export</p>
              <p className="text-xs mt-1" style={{ color: "#9b7c5d" }}>
                These checkboxes affect the downloaded file only. The on-screen table always shows the full admin view.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {ALL_COLUMNS.map((column) => (
                <label
                  key={column.value}
                  className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm"
                  style={{ background: "rgba(255,251,245,0.88)", border: "1px solid rgba(184,159,126,0.22)", color: "#3f2c1d" }}
                >
                  <input
                    type="checkbox"
                    checked={selectedColumns.includes(column.value)}
                    onChange={() => toggleColumn(column.value)}
                  />
                  <span>{column.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[200px_auto]">
            <div className="flex flex-col gap-2">
              <label htmlFor="documentType" className="text-xs font-medium uppercase tracking-[0.14em]" style={{ color: "#9b7c5d" }}>
                Document type
              </label>
              <select
                id="documentType"
                value={documentType}
                onChange={(event) => setDocumentType(event.target.value)}
                className="rounded-xl border px-4 py-2.5 text-sm"
                style={{ background: "rgba(255,251,245,0.92)", borderColor: "rgba(184,159,126,0.35)", color: "#3f2c1d" }}
              >
                <option value="pdf">PDF</option>
                <option value="doc">Word (.doc)</option>
                <option value="csv">CSV</option>
                <option value="xlsx">Excel (.xlsx)</option>
              </select>
            </div>

            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={() => setRefreshToken((current) => current + 1)}
                className="rounded-xl px-4 py-2.5 text-sm font-medium"
                style={{ background: "rgba(255,251,245,0.92)", border: "1px solid rgba(184,159,126,0.35)", color: "#8f6a46" }}
              >
                <span className="inline-flex items-center gap-2">
                  <RefreshCcw className="h-4 w-4" />
                  Refresh
                </span>
              </button>
              <button
                type="button"
                onClick={handleDownload}
                disabled={isDownloading || rows.length === 0}
                className="rounded-xl px-4 py-2.5 text-sm font-medium text-white"
                style={{ background: "linear-gradient(135deg, #8f6a46 0%, #d7b892 100%)" }}
              >
                <span className="inline-flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  {isDownloading ? "Preparing..." : "Download"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="glass rounded-3xl p-5 sm:p-6 overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr style={{ color: "#9b7c5d" }}>
              <th className="text-left py-3">Name</th>
              <th className="text-left py-3">Phone Number</th>
              <th className="text-left py-3">Count</th>
              <th className="text-left py-3">Time &amp; Date Changed</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-t" style={{ borderColor: "rgba(184,159,126,0.22)", color: "#3f2c1d" }}>
                <td className="py-3">
                  <div>
                    <p>{row.name}</p>
                    <p className="text-xs" style={{ color: "#9b7c5d" }}>{row.pendingItems} pending item{row.pendingItems === 1 ? "" : "s"}</p>
                  </div>
                </td>
                <td className="py-3">{row.phone}</td>
                <td className="py-3">{row.count}</td>
                <td className="py-3">{formatNotificationTimestamp(row.lastChangedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {rows.length === 0 ? (
          <p className="mt-4 text-sm" style={{ color: "#9b7c5d" }}>
            No records are currently present in this category.
          </p>
        ) : null}
      </section>
    </div>
  );
}
