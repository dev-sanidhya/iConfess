import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { type LocationCategory } from "@/lib/matching";
import { syncUserProfiles } from "@/lib/profile-details";
import { prisma } from "@/lib/prisma";
import {
  buildSelfClaimSnapshot,
  confessionMatchesSelfClaim,
  convertConfessionToSelf,
} from "@/lib/confessions";
import { validateSelectedProfiles } from "@/lib/profile-details";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({ success: true, userId: session.id });
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { primaryCategory, selectedCategories, profileDetailsByCategory } = await req.json();

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

    const invalidProfile = validateSelectedProfiles(chosenCategories, profileDetailsByCategory ?? {});
    if (invalidProfile) {
      return NextResponse.json(
        {
          error: `Complete the required ${invalidProfile.category.toLowerCase()} details: ${invalidProfile.missingFields.join(", ")}`,
        },
        { status: 400 }
      );
    }


    await prisma.user.update({
      where: { id: session.id },
      data: {
        primaryCategory: primaryCategory as LocationCategory,
      },
    });
    await syncUserProfiles(prisma, session.id, session.name, chosenCategories, profileDetailsByCategory ?? {});

    const [updatedUser, pendingSelfCandidates] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.id },
        include: {
          college: true,
          school: true,
          workplace: true,
          gym: true,
          neighbourhood: true,
          pendingSocialOwnershipRequests: true,
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
