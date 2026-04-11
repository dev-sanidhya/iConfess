import { NextRequest, NextResponse } from "next/server";
import {
  applyNotificationCountDelta,
  getNotificationAudienceRows,
  isNotificationAudienceCategory,
} from "@/lib/internal-notifications";
import { getStaffSession } from "@/lib/staff-auth";

async function ensureAdmin() {
  const staff = await getStaffSession();
  return staff?.role === "ADMIN" ? staff : null;
}

function parseCountFilter(value: string | null) {
  if (!value || value === "all") {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : Number.NaN;
}

export async function GET(req: NextRequest) {
  try {
    const staff = await ensureAdmin();
    if (!staff) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    if (!isNotificationAudienceCategory(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }

    const countFilter = parseCountFilter(searchParams.get("countFilter"));
    if (Number.isNaN(countFilter)) {
      return NextResponse.json({ error: "Invalid count filter" }, { status: 400 });
    }

    const rows = await getNotificationAudienceRows(category, countFilter);
    return NextResponse.json({ rows });
  } catch (error) {
    console.error("[Notifications List Error]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const staff = await ensureAdmin();
    if (!staff) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { category, delta, countFilter: rawCountFilter } = await req.json();
    if (!isNotificationAudienceCategory(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }

    if (typeof delta !== "number" || !Number.isInteger(delta) || delta === 0) {
      return NextResponse.json({ error: "Delta must be a non-zero integer" }, { status: 400 });
    }

    const countFilter =
      rawCountFilter === null || rawCountFilter === undefined || rawCountFilter === "all"
        ? null
        : Number.parseInt(String(rawCountFilter), 10);
    if (countFilter !== null && (!Number.isInteger(countFilter) || countFilter < 0)) {
      return NextResponse.json({ error: "Invalid count filter" }, { status: 400 });
    }

    const rows = await applyNotificationCountDelta(category, delta, countFilter);
    return NextResponse.json({ success: true, rows });
  } catch (error) {
    console.error("[Notifications Count Update Error]", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
