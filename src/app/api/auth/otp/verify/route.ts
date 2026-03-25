import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatPhone } from "@/lib/utils";

// Max wrong OTP attempts before the session is invalidated
const MAX_WRONG_ATTEMPTS = 5;

export async function POST(req: NextRequest) {
  try {
    const { phone, otp } = await req.json();

    if (!phone || !otp) {
      return NextResponse.json({ error: "Phone and OTP are required" }, { status: 400 });
    }

    const formattedPhone = formatPhone(phone);

    // Find the latest valid (unexpired, unverified) session
    const session = await prisma.otpSession.findFirst({
      where: {
        phone: formattedPhone,
        verified: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!session) {
      return NextResponse.json(
        { error: "OTP expired or not found. Please request a new one." },
        { status: 400 }
      );
    }

    // Wrong OTP — count recent failed attempts to prevent brute force
    if (session.otp !== otp) {
      const recentFailed = await prisma.otpSession.count({
        where: {
          phone: formattedPhone,
          verified: false,
          createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
        },
      });

      if (recentFailed >= MAX_WRONG_ATTEMPTS) {
        // Expire the current session immediately
        await prisma.otpSession.update({
          where: { id: session.id },
          data: { expiresAt: new Date() },
        });
        return NextResponse.json(
          { error: "Too many failed attempts. Please request a new OTP." },
          { status: 429 }
        );
      }

      return NextResponse.json({ error: "Invalid OTP. Please try again." }, { status: 400 });
    }

    // OTP is correct — mark as verified
    await prisma.otpSession.update({
      where: { id: session.id },
      data: { verified: true },
    });

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { phone: formattedPhone },
    });

    if (existingUser) {
      return NextResponse.json({
        success: true,
        isNewUser: false,
        hasCredentials: Boolean(existingUser.username && existingUser.passwordHash),
      });
    }

    // New user — send them to registration
    return NextResponse.json({ success: true, isNewUser: true });
  } catch (err) {
    console.error("[OTP Verify Error]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
