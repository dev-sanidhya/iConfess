import { NextRequest, NextResponse } from "next/server";
import { StaffStatus } from "@prisma/client";
import { normalizeUsername, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStaffCookieName, signStaffToken } from "@/lib/staff-auth";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    const normalizedUsername = normalizeUsername(username ?? "");

    const staff = await prisma.staffUser.findUnique({
      where: { username: normalizedUsername },
    });

    if (!staff || staff.status !== StaffStatus.ACTIVE) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const passwordMatches = await verifyPassword(password ?? "", staff.passwordHash);
    if (!passwordMatches) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = signStaffToken(staff.id, staff.role);
    const response = NextResponse.json({ success: true, role: staff.role });
    response.cookies.set(getStaffCookieName(), token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[Staff Login Error]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
