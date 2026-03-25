import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getSession, normalizeSocialHandle, normalizeUsername } from "@/lib/auth";
import { type LocationCategory } from "@/lib/matching";
import { syncUserProfiles } from "@/lib/profile-details";
import { prisma } from "@/lib/prisma";

type Tx = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const {
      name,
      username,
      instagramHandle,
      snapchatHandle,
      primaryCategory,
      selectedCategories,
      profileDetailsByCategory,
    } =
      await req.json();

    const normalizedUsername = normalizeUsername(username ?? "");
    const normalizedInstagramHandle = normalizeSocialHandle(instagramHandle ?? "");
    const normalizedSnapchatHandle = normalizeSocialHandle(snapchatHandle ?? "");

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (!normalizedUsername || normalizedUsername.length < 3) {
      return NextResponse.json(
        { error: "Username must be at least 3 characters long" },
        { status: 400 }
      );
    }

    if (!/^[a-z0-9_]+$/.test(normalizedUsername)) {
      return NextResponse.json(
        { error: "Username can only contain lowercase letters, numbers, and underscores" },
        { status: 400 }
      );
    }

    if (!instagramHandle?.trim() || !snapchatHandle?.trim()) {
      return NextResponse.json(
        { error: "Instagram and Snapchat handles are required. Use NA Handle if not available." },
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

    const duplicateUsername = await prisma.user.findFirst({
      where: { username: normalizedUsername, id: { not: session.id } },
    });
    if (duplicateUsername) {
      return NextResponse.json({ error: "Username is already taken" }, { status: 400 });
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

    await prisma.$transaction(async (tx: Tx) => {
      await tx.user.update({
        where: { id: session.id },
        data: {
          name: name.trim(),
          username: normalizedUsername,
          instagramHandle: normalizedInstagramHandle,
          snapchatHandle: normalizedSnapchatHandle,
          primaryCategory: primaryCategory as LocationCategory,
        },
      });
      await syncUserProfiles(tx, session.id, name.trim(), chosenCategories, profileDetailsByCategory ?? {});
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Profile Update Error]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
