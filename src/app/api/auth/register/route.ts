import { NextRequest, NextResponse } from "next/server";
import { Gender, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { type LocationCategory } from "@/lib/matching";
import { syncUserProfiles } from "@/lib/profile-details";
import {
  signToken,
  COOKIE_NAME_EXPORT,
  hashPassword,
  normalizeUsername,
  normalizeSocialHandle,
} from "@/lib/auth";
import { formatPhone, addDays } from "@/lib/utils";

type Tx = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

export async function POST(req: NextRequest) {
  try {
    const {
      phone,
      name,
      username,
      password,
      gender,
      instagramHandle,
      snapchatHandle,
      primaryCategory,
      selectedCategories,
      profileDetailsByCategory,
    } = await req.json();
    const formattedPhone = formatPhone(phone);
    const normalizedUsername = normalizeUsername(username ?? "");
    if (!instagramHandle?.trim() || !snapchatHandle?.trim()) {
      return NextResponse.json(
        { error: "Instagram and Snapchat handles are required. Use NA Handle if not available." },
        { status: 400 }
      );
    }

    const normalizedInstagramHandle = normalizeSocialHandle(instagramHandle);
    const normalizedSnapchatHandle = normalizeSocialHandle(snapchatHandle);

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (!gender || !Object.values(Gender).includes(gender as Gender)) {
      return NextResponse.json({ error: "Gender is required" }, { status: 400 });
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

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
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

    const existing = await prisma.user.findUnique({ where: { phone: formattedPhone } });
    if (existing) {
      return NextResponse.json({ error: "User already registered" }, { status: 400 });
    }

    const existingUsername = await prisma.user.findUnique({
      where: { username: normalizedUsername },
    });
    if (existingUsername) {
      return NextResponse.json({ error: "Username is already taken" }, { status: 400 });
    }

    if (normalizedInstagramHandle) {
      const existingInstagram = await prisma.user.findUnique({
        where: { instagramHandle: normalizedInstagramHandle },
      });
      if (existingInstagram) {
        return NextResponse.json({ error: "Instagram handle is already taken" }, { status: 400 });
      }
    }

    if (normalizedSnapchatHandle) {
      const existingSnapchat = await prisma.user.findUnique({
        where: { snapchatHandle: normalizedSnapchatHandle },
      });
      if (existingSnapchat) {
        return NextResponse.json({ error: "Snapchat handle is already taken" }, { status: 400 });
      }
    }

    const passwordHash = await hashPassword(password);

    // Create user and profile in a transaction
    const user = await prisma.$transaction(async (tx: Tx) => {
      const newUser = await tx.user.create({
        data: {
          phone: formattedPhone,
          name: name.trim(),
          username: normalizedUsername,
          passwordHash,
          gender: gender as Gender,
          instagramHandle: normalizedInstagramHandle,
          snapchatHandle: normalizedSnapchatHandle,
          primaryCategory: primaryCategory as LocationCategory,
        },
      });
      await syncUserProfiles(tx, newUser.id, newUser.name, chosenCategories, profileDetailsByCategory ?? {});

      return newUser;
    });

    // After registration, check for pending confessions via phone number
    const pendingConfessions = await prisma.confession.findMany({
      where: {
        targetPhone: formattedPhone,
        status: "PENDING",
        expiresAt: { gt: new Date() },
      },
    });

    if (pendingConfessions.length > 0) {
      await prisma.confession.updateMany({
        where: {
          targetPhone: formattedPhone,
          status: "PENDING",
          expiresAt: { gt: new Date() },
        },
        data: { targetId: user.id, status: "DELIVERED" },
      });
    }

    // Check mutual confessions after linking phone-based confessions
    await checkAndMarkMutual(user.id);

    const token = signToken(user.id);
    const response = NextResponse.json({ success: true });
    response.cookies.set(COOKIE_NAME_EXPORT, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
    return response;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function checkAndMarkMutual(userId: string) {
  // Find all confessions this user sent
  const sent = await prisma.confession.findMany({
    where: { senderId: userId, targetId: { not: null } },
    select: { id: true, targetId: true },
  });

  for (const s of sent) {
    if (!s.targetId) continue;
    // Check if target has confessed back
    const reverse = await prisma.confession.findFirst({
      where: { senderId: s.targetId, targetId: userId },
    });
    if (reverse && !s.targetId) continue;
    if (reverse) {
      await prisma.confession.updateMany({
        where: { id: { in: [s.id, reverse.id] } },
        data: { mutualDetected: true },
      });
    }
  }
}

export { addDays };
