import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { verifyStaffToken } from "@/lib/staff-auth";

const protectedPrefixes = ["/dashboard"];
const authRoutes = ["/auth/login", "/auth/register"];
const staffProtectedPrefixes = ["/admin", "/employee"];
const staffAuthRoutes = ["/staff/login"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("iconfess_token")?.value;
  const staffToken = req.cookies.get("iconfess_staff_token")?.value;
  const isAuthenticated = token ? verifyToken(token) !== null : false;
  const staffPayload = staffToken ? verifyStaffToken(staffToken) : null;
  const isStaffAuthenticated = staffPayload !== null;

  const isProtected = protectedPrefixes.some((p) => pathname.startsWith(p));
  const isAuthRoute = authRoutes.some((p) => pathname.startsWith(p));
  const isStaffProtected = staffProtectedPrefixes.some((p) => pathname.startsWith(p));
  const isStaffAuthRoute = staffAuthRoutes.some((p) => pathname.startsWith(p));

  if (isProtected && !isAuthenticated) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (isStaffProtected && !isStaffAuthenticated) {
    return NextResponse.redirect(new URL("/staff/login", req.url));
  }

  if (pathname.startsWith("/admin") && staffPayload?.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/employee", req.url));
  }

  if (isStaffAuthRoute && isStaffAuthenticated) {
    const destination = staffPayload?.role === "ADMIN" ? "/admin" : "/employee";
    return NextResponse.redirect(new URL(destination, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
