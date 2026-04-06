import { NextRequest, NextResponse } from "next/server";
import { ActivityType } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { recordUserActivity } from "@/lib/activity";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const type = Object.values(ActivityType).includes(body?.type as ActivityType)
      ? (body.type as ActivityType)
      : null;

    if (!type) {
      return NextResponse.json({ error: "Invalid activity type" }, { status: 400 });
    }

    const session = await getSession();
    const anonymousId = typeof body?.anonymousId === "string" ? body.anonymousId : null;
    const path = typeof body?.path === "string" ? body.path : null;

    await recordUserActivity({
      userId: session?.id ?? null,
      anonymousId,
      type,
      path,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Activity Tracking Error]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
