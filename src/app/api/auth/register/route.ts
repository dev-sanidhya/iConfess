import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { signToken, COOKIE_NAME_EXPORT } from "@/lib/auth";
import { formatPhone, addDays } from "@/lib/utils";

type Tx = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

export async function POST(req: NextRequest) {
  try {
    const { phone, name, category, profileData } = await req.json();
    const formattedPhone = formatPhone(phone);

    const existing = await prisma.user.findUnique({ where: { phone: formattedPhone } });
    if (existing) {
      return NextResponse.json({ error: "User already registered" }, { status: 400 });
    }

    // Create user and profile in a transaction
    const user = await prisma.$transaction(async (tx: Tx) => {
      const newUser = await tx.user.create({
        data: { phone: formattedPhone, name },
      });

      if (category === "COLLEGE") {
        await tx.collegeProfile.create({
          data: {
            userId: newUser.id,
            collegeName: profileData.collegeName,
            pinCode: profileData.pinCode,
            course: profileData.course,
            branch: profileData.branch,
            yearOfPassing: parseInt(profileData.yearOfPassing),
            section: profileData.section,
            fullName: profileData.fullName,
          },
        });
      } else if (category === "SCHOOL") {
        await tx.schoolProfile.create({
          data: {
            userId: newUser.id,
            schoolName: profileData.schoolName,
            pinCode: profileData.pinCode,
            board: profileData.board,
            yearOfCompletion: parseInt(profileData.yearOfCompletion),
            section: profileData.section,
            fullName: profileData.fullName,
          },
        });
      } else if (category === "WORKPLACE") {
        await tx.workplaceProfile.create({
          data: {
            userId: newUser.id,
            companyName: profileData.companyName,
            department: profileData.department,
            city: profileData.city,
            buildingName: profileData.buildingName,
            fullName: profileData.fullName,
          },
        });
      } else if (category === "GYM") {
        await tx.gymProfile.create({
          data: {
            userId: newUser.id,
            gymName: profileData.gymName,
            city: profileData.city,
            pinCode: profileData.pinCode,
            timing: profileData.timing,
            fullName: profileData.fullName,
          },
        });
      } else if (category === "NEIGHBOURHOOD") {
        await tx.neighbourhoodProfile.create({
          data: {
            userId: newUser.id,
            state: profileData.state,
            city: profileData.city,
            pinCode: profileData.pinCode,
            premisesName: profileData.premisesName,
            fullName: profileData.fullName,
          },
        });
      }

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
