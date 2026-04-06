import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatPhone } from "@/lib/utils";
import { hashPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { phone, password } = await req.json();

    if (!phone || !/^\d{10}$/.test(phone)) {
      return NextResponse.json({ error: "Enter a valid 10-digit phone number" }, { status: 400 });
    }

    const formattedPhone = formatPhone(phone);

    if (!password || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters long" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { phone: formattedPhone },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "No account exists for this phone number" }, { status: 404 });
    }

    const verifiedSession = await prisma.otpSession.findFirst({
      where: {
        phone: formattedPhone,
        verified: true,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    if (!verifiedSession) {
      return NextResponse.json({ error: "Verify your phone number with OTP before resetting credentials" }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
        },
      }),
      prisma.otpSession.update({
        where: { id: verifiedSession.id },
        data: { expiresAt: new Date() },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Credential Recovery Error]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
