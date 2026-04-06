import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  COOKIE_NAME_EXPORT,
  signToken,
  verifyPassword,
} from "@/lib/auth";
import { formatPhone } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const { phone, password } = await req.json();

    if (!phone || !password) {
      return NextResponse.json(
        { error: "Phone number and password are required" },
        { status: 400 }
      );
    }

    if (!/^\d{10}$/.test(phone)) {
      return NextResponse.json(
        { error: "Enter a valid 10-digit phone number" },
        { status: 400 }
      );
    }

    const formattedPhone = formatPhone(phone);
    const user = await prisma.user.findUnique({
      where: { phone: formattedPhone },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: "Invalid phone number or password" },
        { status: 401 }
      );
    }

    const passwordMatches = await verifyPassword(password, user.passwordHash);
    if (!passwordMatches) {
      return NextResponse.json(
        { error: "Invalid phone number or password" },
        { status: 401 }
      );
    }

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
  } catch (error) {
    console.error("[Credential Login Error]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
