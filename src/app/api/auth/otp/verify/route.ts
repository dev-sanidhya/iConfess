import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken, COOKIE_NAME_EXPORT } from "@/lib/auth";
import { formatPhone } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const { phone, otp } = await req.json();
    const formattedPhone = formatPhone(phone);

    const session = await prisma.otpSession.findFirst({
      where: {
        phone: formattedPhone,
        otp,
        verified: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!session) {
      return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 });
    }

    await prisma.otpSession.update({
      where: { id: session.id },
      data: { verified: true },
    });

    const existingUser = await prisma.user.findUnique({ where: { phone: formattedPhone } });

    if (existingUser) {
      const token = signToken(existingUser.id);
      const response = NextResponse.json({ success: true, isNewUser: false });
      response.cookies.set(COOKIE_NAME_EXPORT, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
      });
      return response;
    }

    return NextResponse.json({ success: true, isNewUser: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
