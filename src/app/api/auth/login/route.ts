import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  COOKIE_NAME_EXPORT,
  normalizeUsername,
  signToken,
  verifyPassword,
} from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    const normalizedUsername = normalizeUsername(username);
    const user = await prisma.user.findUnique({
      where: { username: normalizedUsername },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    const passwordMatches = await verifyPassword(password, user.passwordHash);
    if (!passwordMatches) {
      return NextResponse.json(
        { error: "Invalid username or password" },
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
