import { NextRequest, NextResponse } from "next/server";
import { PendingProfileSearchKind } from "@prisma/client";
import { getSession, normalizeSocialHandle } from "@/lib/auth";
import { type LocationCategory } from "@/lib/matching";
import { syncUserProfiles } from "@/lib/profile-details";
import {
  claimPendingProfileSearchCounts,
  ensureProfileSearchCountSeeded,
} from "@/lib/profile-search-count";
import { prisma } from "@/lib/prisma";
import {
  buildSelfClaimSnapshot,
  confessionMatchesSelfClaim,
  convertConfessionToSelf,
} from "@/lib/confessions";

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const {
      name,
      instagramHandle,
      snapchatHandle,
      primaryCategory,
      selectedCategories,
      profileDetailsByCategory,
    } =
      await req.json();

    const normalizedInstagramHandle = normalizeSocialHandle(instagramHandle ?? "");
    const normalizedSnapchatHandle = normalizeSocialHandle(snapchatHandle ?? "");

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (!instagramHandle?.trim() || !snapchatHandle?.trim()) {
      return NextResponse.json(
        { error: "Instagram and Snapchat handles are required. Use NA if not available." },
        { status: 400 }
      );
    }

    const chosenCategories = Array.isArray(selectedCategories)
      ? selectedCategories.filter(Boolean) as LocationCategory[]
      : [];

    if (chosenCategories.length === 0) {
      return NextResponse.json({ error: "Select at least one profile category" }, { status: 400 });
    }

    if (
      !primaryCategory ||
      !chosenCategories.includes(primaryCategory as LocationCategory)
    ) {
      return NextResponse.json(
        { error: "Choose a valid primary category from the selected profile categories" },
        { status: 400 }
      );
    }

    if (normalizedInstagramHandle) {
      const duplicateInstagram = await prisma.user.findFirst({
        where: { instagramHandle: normalizedInstagramHandle, id: { not: session.id } },
      });
      if (duplicateInstagram) {
        return NextResponse.json({ error: "Instagram handle is already taken" }, { status: 400 });
      }
    }

    if (normalizedSnapchatHandle) {
      const duplicateSnapchat = await prisma.user.findFirst({
        where: { snapchatHandle: normalizedSnapchatHandle, id: { not: session.id } },
      });
      if (duplicateSnapchat) {
        return NextResponse.json({ error: "Snapchat handle is already taken" }, { status: 400 });
      }
    }

    const carriedSearchCount = await claimPendingProfileSearchCounts(
      [
        { kind: PendingProfileSearchKind.INSTAGRAM, value: normalizedInstagramHandle },
        { kind: PendingProfileSearchKind.SNAPCHAT, value: normalizedSnapchatHandle },
      ],
      prisma
    );

    if (carriedSearchCount > 0) {
      const currentSearchCount = await ensureProfileSearchCountSeeded(session.id, prisma);
      await prisma.user.update({
        where: { id: session.id },
        data: {
          profileSearchCount: currentSearchCount + carriedSearchCount,
        },
      });
    }

    await prisma.user.update({
      where: { id: session.id },
      data: {
        name: name.trim(),
        instagramHandle: normalizedInstagramHandle,
        snapchatHandle: normalizedSnapchatHandle,
        primaryCategory: primaryCategory as LocationCategory,
      },
    });
    await syncUserProfiles(prisma, session.id, name.trim(), chosenCategories, profileDetailsByCategory ?? {});

    const [updatedUser, pendingSelfCandidates] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.id },
        include: {
          college: true,
          school: true,
          workplace: true,
          gym: true,
          neighbourhood: true,
        },
      }),
      prisma.confession.findMany({
        where: {
          senderId: session.id,
          status: "PENDING",
          isSelfConfession: false,
        },
        select: {
          id: true,
          location: true,
          targetPhone: true,
          matchDetails: true,
          billingState: true,
        },
      }),
    ]);

    const convertedIds: string[] = [];
    const paymentRequiredIds: string[] = [];

    if (updatedUser) {
      const selfClaimSnapshot = buildSelfClaimSnapshot(updatedUser);

      for (const confession of pendingSelfCandidates) {
        if (!confessionMatchesSelfClaim(confession, selfClaimSnapshot)) {
          continue;
        }

        if (confession.billingState === "FREE") {
          paymentRequiredIds.push(confession.id);
          continue;
        }

        try {
          await convertConfessionToSelf(confession.id, session.id, prisma);
          convertedIds.push(confession.id);
        } catch (claimError) {
          console.error("[Self Claim Conversion Error]", {
            confessionId: confession.id,
            userId: session.id,
            error: claimError,
          });
        }
      }
    }

    return NextResponse.json({ success: true, convertedIds, paymentRequiredIds });
  } catch (error) {
    console.error("[Profile Update Error]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Internal server error",
      },
      { status: 500 }
    );
  }
}
