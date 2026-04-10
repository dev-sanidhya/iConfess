import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  submitPendingSocialOwnershipRequest,
  toSocialPlatform,
} from "@/lib/social-ownership";

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const platform = toSocialPlatform(typeof body.platform === "string" ? body.platform : null);
    const handle = typeof body.handle === "string" ? body.handle : "";

    if (!platform) {
      return NextResponse.json({ error: "Choose a valid social platform." }, { status: 400 });
    }

    const result = await submitPendingSocialOwnershipRequest({
      user: {
        id: user.id,
        instagramHandle: user.instagramHandle,
        snapchatHandle: user.snapchatHandle,
      },
      platform,
      handle,
      db: prisma,
    });

    return NextResponse.json({
      success: true,
      alreadyVerified: result.alreadyVerified,
      request: result.request
        ? {
            id: result.request.id,
            platform: result.request.platform,
            submittedHandle: result.request.submittedHandle,
            normalizedHandle: result.request.normalizedHandle,
          }
        : null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to submit verification request.",
      },
      { status: 400 }
    );
  }
}
