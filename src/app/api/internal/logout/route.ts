import { NextResponse } from "next/server";
import { getStaffCookieName } from "@/lib/staff-auth";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(getStaffCookieName(), "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: new Date(0),
    path: "/",
  });
  return response;
}
