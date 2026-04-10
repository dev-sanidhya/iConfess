import { NextRequest, NextResponse } from "next/server";
import { ensureStaffPermission } from "@/lib/staff-auth";
import { STAFF_PERMISSIONS } from "@/lib/staff-types";
import { prisma } from "@/lib/prisma";
import {
  acceptPendingSocialOwnershipRequest,
  rejectPendingSocialOwnershipRequest,
} from "@/lib/social-ownership";

type RouteParams = {
  params: Promise<{
    requestId: string;
  }>;
};

export async function POST(req: NextRequest, { params }: RouteParams) {
  const staff = await ensureStaffPermission(STAFF_PERMISSIONS[0]);
  if (staff === null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (staff === false) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { requestId } = await params;
    const body = await req.json();
    const action = body?.action;

    if (action !== "accept" && action !== "reject") {
      return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    }

    if (action === "accept") {
      await acceptPendingSocialOwnershipRequest(requestId, prisma);
    } else {
      await rejectPendingSocialOwnershipRequest(requestId, prisma);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update verification request.";
    const removeFromQueue = message.startsWith("REMOVE_FROM_QUEUE::");

    return NextResponse.json(
      {
        error: removeFromQueue ? message.replace("REMOVE_FROM_QUEUE::", "") : message,
        removeFromQueue,
      },
      { status: 400 }
    );
  }
}
