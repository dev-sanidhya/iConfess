import { NextRequest, NextResponse } from "next/server";
import {
  buildNotificationCsv,
  buildNotificationPdf,
  buildNotificationWordDocument,
  buildNotificationXlsx,
  getNotificationAudienceLabel,
  getNotificationAudienceRows,
  isNotificationAudienceCategory,
  type NotificationExportColumn,
} from "@/lib/internal-notifications";
import { getStaffSession } from "@/lib/staff-auth";

const ALLOWED_COLUMNS: NotificationExportColumn[] = ["name", "phone", "count", "lastChangedAt"];
const ALLOWED_DOCUMENT_TYPES = ["pdf", "doc", "csv", "xlsx"] as const;

function sanitizeColumns(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }

  const columns = value.filter((entry): entry is NotificationExportColumn =>
    ALLOWED_COLUMNS.includes(entry as NotificationExportColumn)
  );

  return columns.length > 0 ? columns : null;
}

function buildFileName(label: string, extension: string) {
  return `${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}.${extension}`;
}

export async function POST(req: NextRequest) {
  try {
    const staff = await getStaffSession();
    if (!staff || staff.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { category, documentType, columns, countFilter: rawCountFilter } = await req.json();
    if (!isNotificationAudienceCategory(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }

    if (!ALLOWED_DOCUMENT_TYPES.includes(documentType)) {
      return NextResponse.json({ error: "Invalid document type" }, { status: 400 });
    }

    const selectedColumns = sanitizeColumns(columns);
    if (!selectedColumns) {
      return NextResponse.json({ error: "Select at least one valid column" }, { status: 400 });
    }

    const countFilter =
      rawCountFilter === null || rawCountFilter === undefined || rawCountFilter === "all"
        ? null
        : Number.parseInt(String(rawCountFilter), 10);
    if (countFilter !== null && (!Number.isInteger(countFilter) || countFilter < 0)) {
      return NextResponse.json({ error: "Invalid count filter" }, { status: 400 });
    }

    const rows = await getNotificationAudienceRows(category, countFilter);
    const label = getNotificationAudienceLabel(category);

    if (documentType === "csv") {
      const csv = buildNotificationCsv(rows, selectedColumns);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${buildFileName(label, "csv")}"`,
        },
      });
    }

    if (documentType === "doc") {
      const html = buildNotificationWordDocument(category, rows, selectedColumns);
      return new NextResponse(html, {
        headers: {
          "Content-Type": "application/msword; charset=utf-8",
          "Content-Disposition": `attachment; filename="${buildFileName(label, "doc")}"`,
        },
      });
    }

    if (documentType === "xlsx") {
      const workbook = buildNotificationXlsx(category, rows, selectedColumns);
      return new NextResponse(workbook, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${buildFileName(label, "xlsx")}"`,
        },
      });
    }

    const pdf = buildNotificationPdf(category, rows, selectedColumns);
    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${buildFileName(label, "pdf")}"`,
      },
    });
  } catch (error) {
    console.error("[Notifications Export Error]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
