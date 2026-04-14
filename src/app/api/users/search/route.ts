import { NextRequest, NextResponse } from "next/server";
import { getSession, normalizeSocialHandle } from "@/lib/auth";
import {
  buildProfileMatchContext,
  findDirectShadowProfile,
  getSearchResultByIds,
  getSearchResultsByShadowIds,
  findMatches,
  findMatchingShadowProfiles,
  type LocationCategory,
} from "@/lib/matching";
import {
  incrementPendingProfileSearchCount,
  incrementProfileSearchCounts,
} from "@/lib/profile-search-count";
import { prisma } from "@/lib/prisma";
import { formatPhone } from "@/lib/utils";
import { PendingProfileSearchKind } from "@prisma/client";
import { countSentConfessionsToOthers } from "@/lib/confessions";
import { buildPendingProfileSearchValue, getPendingKindForLocation, incrementShadowProfileSearchCount } from "@/lib/shadow-profiles";

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const viewerSentCount = await countSentConfessionsToOthers(user.id, prisma);

    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode");

    if (mode === "phone") {
      const phone = searchParams.get("phone")?.trim();
      if (!phone || !/^\d{10}$/.test(phone)) {
        return NextResponse.json({ results: [], viewerSentCount });
      }

      const target = await prisma.user.findUnique({
        where: { phone: formatPhone(phone) },
      });
      const shadow = target ? null : await findDirectShadowProfile(PendingProfileSearchKind.PHONE, { phone: formatPhone(phone) });

      if (target && target.id !== user.id) {
        await incrementProfileSearchCounts([target.id], prisma);
      } else if (shadow) {
        await incrementShadowProfileSearchCount([shadow.id], prisma);
      } else if (!target) {
        await incrementPendingProfileSearchCount(
          PendingProfileSearchKind.PHONE,
          formatPhone(phone),
          prisma
        );
      }

      const results = target
        ? (await getSearchResultByIds([target.id], user.id, { includeCurrentUser: true }))
        : shadow
          ? await getSearchResultsByShadowIds([shadow.id], user.id)
          : [];

      const mappedResults = results.map((result) => ({
        ...result,
        matchContext: ["Matched by phone number"],
      }));
      return NextResponse.json({ results: mappedResults, viewerSentCount });
    }

    if (mode === "social") {
      const platform = searchParams.get("platform");
      const handle = normalizeSocialHandle(searchParams.get("handle") ?? "");

      if (!handle || (platform !== "instagram" && platform !== "snapchat")) {
        return NextResponse.json({ results: [], viewerSentCount });
      }

      const target = await prisma.user.findFirst({
        where: {
          ...(platform === "instagram"
            ? { instagramHandle: handle }
            : { snapchatHandle: handle }),
        },
      });
      const shadow = target
        ? null
        : await findDirectShadowProfile(
            platform === "instagram" ? PendingProfileSearchKind.INSTAGRAM : PendingProfileSearchKind.SNAPCHAT,
            { platform, handle }
          );

      if (target && target.id !== user.id) {
        await incrementProfileSearchCounts([target.id], prisma);
      } else if (shadow) {
        await incrementShadowProfileSearchCount([shadow.id], prisma);
      } else if (!target) {
        await incrementPendingProfileSearchCount(
          platform === "instagram"
            ? PendingProfileSearchKind.INSTAGRAM
            : PendingProfileSearchKind.SNAPCHAT,
          handle,
          prisma
        );
      }

      const results = target
        ? (await getSearchResultByIds([target.id], user.id, { includeCurrentUser: true }))
        : shadow
          ? await getSearchResultsByShadowIds([shadow.id], user.id)
          : [];

      const mappedResults = results.map((result) => ({
        ...result,
        matchContext: [
          platform === "instagram"
            ? `Instagram: @${result.instagramHandle ?? handle}`
            : `Snapchat: @${result.snapchatHandle ?? handle}`,
        ],
      }));
      return NextResponse.json({ results: mappedResults, viewerSentCount });
    }

    if (mode === "profile") {
      const location = searchParams.get("location");
      if (!location) {
        return NextResponse.json({ results: [], viewerSentCount });
      }

      const details: Record<string, string> = {};
      for (const [key, value] of searchParams.entries()) {
        if (key !== "mode" && key !== "location" && value.trim()) {
          details[key] = value.trim();
        }
      }

      const fullName = [details.firstName, details.lastName].filter(Boolean).join(" ").trim();
      if (!details.firstName) {
        return NextResponse.json({ results: [], viewerSentCount });
      }
      if (fullName) {
        details.fullName = fullName;
      }
      delete details.firstName;
      delete details.lastName;

      const matches = await findMatches(location, details);
      const shadowMatches = await findMatchingShadowProfiles(location as LocationCategory, details);
      const uniqueIds = [...new Set(matches.map((match: { id: string }) => match.id))];
      const targetUserIds = uniqueIds.filter((id) => id !== user.id);

      await incrementProfileSearchCounts(targetUserIds, prisma);
      await incrementShadowProfileSearchCount(shadowMatches.map((shadow) => shadow.id), prisma);

      if (uniqueIds.length === 0 && shadowMatches.length === 0) {
        await incrementPendingProfileSearchCount(
          getPendingKindForLocation(location as LocationCategory),
          buildPendingProfileSearchValue(getPendingKindForLocation(location as LocationCategory), details),
          prisma
        );
      }

      const results = [
        ...(await getSearchResultByIds(uniqueIds, user.id, { includeCurrentUser: true })),
        ...(await getSearchResultsByShadowIds(shadowMatches.map((shadow) => shadow.id), user.id)),
      ]
        .map((result) => ({
          ...result,
          matchContext: buildProfileMatchContext(location as LocationCategory, details, result),
        }))
        .filter((result, index, collection) => collection.findIndex((entry) => entry.id === result.id) === index);
      return NextResponse.json({ results, viewerSentCount });
    }

    return NextResponse.json({ results: [], viewerSentCount });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


