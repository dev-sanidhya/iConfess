import { NextRequest, NextResponse } from "next/server";
import { getSession, normalizeSocialHandle } from "@/lib/auth";
import {
  buildProfileMatchContext,
  getSearchResultByIds,
  findMatches,
  type LocationCategory,
} from "@/lib/matching";
import { prisma } from "@/lib/prisma";
import { formatPhone } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode");

    if (mode === "phone") {
      const phone = searchParams.get("phone")?.trim();
      if (!phone || !/^\d{10}$/.test(phone)) {
        return NextResponse.json({ results: [] });
      }

      const target = await prisma.user.findUnique({
        where: { phone: formatPhone(phone) },
      });

      const results = (await getSearchResultByIds(target ? [target.id] : [], user.id)).map((result) => ({
        ...result,
        matchContext: ["Matched by phone number"],
      }));
      return NextResponse.json({ results });
    }

    if (mode === "social") {
      const platform = searchParams.get("platform");
      const handle = normalizeSocialHandle(searchParams.get("handle") ?? "");

      if (!handle || (platform !== "instagram" && platform !== "snapchat")) {
        return NextResponse.json({ results: [] });
      }

      const target = await prisma.user.findFirst({
        where: {
          ...(platform === "instagram"
            ? { instagramHandle: handle }
            : { snapchatHandle: handle }),
        },
      });

      const results = (await getSearchResultByIds(target ? [target.id] : [], user.id)).map((result) => ({
        ...result,
        matchContext: [
          platform === "instagram"
            ? `Instagram: @${result.instagramHandle ?? handle}`
            : `Snapchat: @${result.snapchatHandle ?? handle}`,
        ],
      }));
      return NextResponse.json({ results });
    }

    if (mode === "profile") {
      const location = searchParams.get("location");
      if (!location) {
        return NextResponse.json({ results: [] });
      }

      const details: Record<string, string> = {};
      for (const [key, value] of searchParams.entries()) {
        if (key !== "mode" && key !== "location" && value.trim()) {
          details[key] = value.trim();
        }
      }

      const matches = await findMatches(location, details);
      const uniqueIds = [...new Set(matches.map((match: { id: string }) => match.id))];
      const results = (await getSearchResultByIds(uniqueIds, user.id)).map((result) => ({
        ...result,
        matchContext: buildProfileMatchContext(location as LocationCategory, details, result),
      }));
      return NextResponse.json({ results });
    }

    return NextResponse.json({ results: [] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
