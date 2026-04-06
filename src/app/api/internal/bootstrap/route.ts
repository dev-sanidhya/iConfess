import { NextRequest, NextResponse } from "next/server";
import { hashPassword, normalizeUsername } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStaffCookieName, hasAnyAdmin, signStaffToken } from "@/lib/staff-auth";
import { STAFF_PERMISSIONS } from "@/lib/staff-types";

export async function POST(req: NextRequest) {
  try {
    if (await hasAnyAdmin()) {
      return NextResponse.json({ error: "Admin account already exists" }, { status: 403 });
    }

    const { name, username, password } = await req.json();
    const normalizedUsername = normalizeUsername(username ?? "");

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (!normalizedUsername || normalizedUsername.length < 3 || !/^[a-z0-9_]+$/.test(normalizedUsername)) {
      return NextResponse.json({ error: "Enter a valid username" }, { status: 400 });
    }

    if (!password || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters long" }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    const staff = await prisma.staffUser.create({
      data: {
        name: name.trim(),
        username: normalizedUsername,
        passwordHash,
        role: "ADMIN",
        permissions: [...STAFF_PERMISSIONS],
      },
    });

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
    console.error("[Staff Bootstrap Error]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
