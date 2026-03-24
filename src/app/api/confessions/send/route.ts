import { NextRequest, NextResponse } from "next/server";
import { User } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addDays } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { flow, location, matchDetails, message, targetPhone } = body;

    if (!message?.trim()) return NextResponse.json({ error: "Message required" }, { status: 400 });

    const sentCount = await prisma.confession.count({ where: { senderId: user.id } });
    const isFree = sentCount === 0;

    if (!isFree) {
      // Payment check — Razorpay integration will go here
      // For now we proceed; in production verify payment first
    }

    const expiresAt = addDays(new Date(), 90);

    if (flow === "phone") {
      // Check if phone is already registered
      const existingUser = await prisma.user.findUnique({ where: { phone: targetPhone } });

      if (existingUser) {
        // Check if already confessed this user
        const existing = await prisma.confession.findFirst({
          where: { senderId: user.id, targetId: existingUser.id },
        });
        if (existing) return NextResponse.json({ error: "You've already confessed this person" }, { status: 400 });

        const confession = await createAndCheckMutual(user.id, existingUser.id, null, "COLLEGE", {}, message, expiresAt, "DELIVERED");
        return NextResponse.json({ success: true, matchFound: true, confessionId: confession.id, requiresPayment: !isFree });
      }

      // Unregistered — queue via phone
      const confession = await prisma.confession.create({
        data: {
          senderId: user.id,
          targetPhone,
          message,
          location: "COLLEGE", // default for phone flow
          matchDetails: {},
          status: "PENDING",
          expiresAt,
        },
      });

      // In production: send WhatsApp message via Meta/Twilio
      console.log(`[DEV] WhatsApp to ${targetPhone}: Someone has a confession for you on iConfess!`);

      return NextResponse.json({ success: true, matchFound: false, confessionId: confession.id, requiresPayment: !isFree });
    }

    // Profile matching flow
    if (!location || !matchDetails) return NextResponse.json({ error: "Location details required" }, { status: 400 });

    const matches = await findMatches(location, matchDetails);

    if (matches.length === 0) {
      const confession = await prisma.confession.create({
        data: { senderId: user.id, message, location, matchDetails, status: "PENDING", expiresAt },
      });
      return NextResponse.json({ success: true, matchFound: false, confessionId: confession.id, requiresPayment: !isFree });
    }

    if (matches.length > 1) {
      return NextResponse.json({
        success: false,
        multipleMatches: true,
        count: matches.length,
        error: "Multiple people match. Please provide more specific details.",
      }, { status: 409 });
    }

    const target = matches[0];
    if (target.id === user.id) return NextResponse.json({ error: "You cannot confess yourself" }, { status: 400 });

    const existing = await prisma.confession.findFirst({ where: { senderId: user.id, targetId: target.id } });
    if (existing) return NextResponse.json({ error: "You've already confessed this person" }, { status: 400 });

    const confession = await createAndCheckMutual(user.id, target.id, null, location as "COLLEGE" | "SCHOOL" | "WORKPLACE" | "GYM" | "NEIGHBOURHOOD", matchDetails, message, expiresAt, "DELIVERED");

    return NextResponse.json({ success: true, matchFound: true, confessionId: confession.id, requiresPayment: !isFree });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function findMatches(location: string, details: Record<string, string>) {
  const fullName = details.fullName?.toLowerCase().trim();

  if (location === "COLLEGE") {
    const profiles = await prisma.collegeProfile.findMany({
      where: {
        ...(details.collegeName && { collegeName: { contains: details.collegeName, mode: "insensitive" } }),
        ...(details.pinCode && { pinCode: details.pinCode }),
        ...(details.course && { course: { contains: details.course, mode: "insensitive" } }),
        ...(details.branch && { branch: { contains: details.branch, mode: "insensitive" } }),
        ...(details.yearOfPassing && { yearOfPassing: parseInt(details.yearOfPassing) }),
        ...(details.section && { section: { contains: details.section, mode: "insensitive" } }),
        ...(fullName && { fullName: { contains: fullName, mode: "insensitive" } }),
      },
      include: { user: true },
    });
    return profiles.map((p: { user: User }) => p.user);
  }

  if (location === "SCHOOL") {
    const profiles = await prisma.schoolProfile.findMany({
      where: {
        ...(details.schoolName && { schoolName: { contains: details.schoolName, mode: "insensitive" } }),
        ...(details.pinCode && { pinCode: details.pinCode }),
        ...(details.board && { board: details.board }),
        ...(details.yearOfCompletion && { yearOfCompletion: parseInt(details.yearOfCompletion) }),
        ...(details.section && { section: { contains: details.section, mode: "insensitive" } }),
        ...(fullName && { fullName: { contains: fullName, mode: "insensitive" } }),
      },
      include: { user: true },
    });
    return profiles.map((p: { user: User }) => p.user);
  }

  if (location === "WORKPLACE") {
    const profiles = await prisma.workplaceProfile.findMany({
      where: {
        ...(details.companyName && { companyName: { contains: details.companyName, mode: "insensitive" } }),
        ...(details.department && { department: { contains: details.department, mode: "insensitive" } }),
        ...(details.city && { city: { contains: details.city, mode: "insensitive" } }),
        ...(details.buildingName && { buildingName: { contains: details.buildingName, mode: "insensitive" } }),
        ...(fullName && { fullName: { contains: fullName, mode: "insensitive" } }),
      },
      include: { user: true },
    });
    return profiles.map((p: { user: User }) => p.user);
  }

  if (location === "GYM") {
    const profiles = await prisma.gymProfile.findMany({
      where: {
        ...(details.gymName && { gymName: { contains: details.gymName, mode: "insensitive" } }),
        ...(details.city && { city: { contains: details.city, mode: "insensitive" } }),
        ...(details.pinCode && { pinCode: details.pinCode }),
        ...(details.timing && { timing: details.timing as "MORNING" | "EVENING" | "BOTH" }),
        ...(fullName && { fullName: { contains: fullName, mode: "insensitive" } }),
      },
      include: { user: true },
    });
    return profiles.map((p: { user: User }) => p.user);
  }

  if (location === "NEIGHBOURHOOD") {
    const profiles = await prisma.neighbourhoodProfile.findMany({
      where: {
        ...(details.state && { state: { contains: details.state, mode: "insensitive" } }),
        ...(details.city && { city: { contains: details.city, mode: "insensitive" } }),
        ...(details.pinCode && { pinCode: details.pinCode }),
        ...(details.premisesName && { premisesName: { contains: details.premisesName, mode: "insensitive" } }),
        ...(fullName && { fullName: { contains: fullName, mode: "insensitive" } }),
      },
      include: { user: true },
    });
    return profiles.map((p: { user: User }) => p.user);
  }

  return [];
}

async function createAndCheckMutual(
  senderId: string,
  targetId: string,
  targetPhone: string | null,
  location: "COLLEGE" | "SCHOOL" | "WORKPLACE" | "GYM" | "NEIGHBOURHOOD",
  matchDetails: Record<string, string>,
  message: string,
  expiresAt: Date,
  status: "DELIVERED" | "PENDING"
) {
  const confession = await prisma.confession.create({
    data: { senderId, targetId, targetPhone, message, location, matchDetails, status, expiresAt },
  });

  // Check mutual
  const reverse = await prisma.confession.findFirst({
    where: { senderId: targetId, targetId: senderId },
  });

  if (reverse) {
    await prisma.confession.updateMany({
      where: { id: { in: [confession.id, reverse.id] } },
      data: { mutualDetected: true },
    });
  }

  return confession;
}
