import { NextRequest, NextResponse } from "next/server";
import { StaffPermission, StaffRole, StaffStatus } from "@prisma/client";
import { hashPassword, normalizeUsername } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStaffSession } from "@/lib/staff-auth";

function getNormalizedPermissions(role: StaffRole, permissions: unknown) {
  if (role === StaffRole.ADMIN) {
    return Object.values(StaffPermission);
  }

  if (!Array.isArray(permissions)) {
    return [];
  }

  return permissions.filter((permission): permission is StaffPermission =>
    Object.values(StaffPermission).includes(permission as StaffPermission)
  );
}

export async function GET() {
  try {
    const staff = await getStaffSession();
    if (!staff || staff.role !== StaffRole.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const accounts = await prisma.staffUser.findMany({
      orderBy: [{ role: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        status: true,
        permissions: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error("[Staff Accounts List Error]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const staff = await getStaffSession();
    if (!staff || staff.role !== StaffRole.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { name, username, password, role, permissions } = await req.json();
    const normalizedUsername = normalizeUsername(username ?? "");
    const normalizedRole = Object.values(StaffRole).includes(role as StaffRole)
      ? (role as StaffRole)
      : null;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (!normalizedUsername || normalizedUsername.length < 3 || !/^[a-z0-9_]+$/.test(normalizedUsername)) {
      return NextResponse.json({ error: "Enter a valid username" }, { status: 400 });
    }

    if (!password || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters long" }, { status: 400 });
    }

    if (!normalizedRole) {
      return NextResponse.json({ error: "Select a valid role" }, { status: 400 });
    }

    const existing = await prisma.staffUser.findUnique({
      where: { username: normalizedUsername },
    });
    if (existing) {
      return NextResponse.json({ error: "Username is already in use" }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    const account = await prisma.staffUser.create({
      data: {
        name: name.trim(),
        username: normalizedUsername,
        passwordHash,
        role: normalizedRole,
        permissions: getNormalizedPermissions(normalizedRole, permissions),
      },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        status: true,
        permissions: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ success: true, account });
  } catch (error) {
    console.error("[Staff Account Create Error]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getStaffSession();
    if (!session || session.role !== StaffRole.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id, name, username, password, role, permissions, status } = await req.json();
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Account id is required" }, { status: 400 });
    }

    const existing = await prisma.staffUser.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const normalizedRole = Object.values(StaffRole).includes(role as StaffRole)
      ? (role as StaffRole)
      : existing.role;
    const normalizedStatus = Object.values(StaffStatus).includes(status as StaffStatus)
      ? (status as StaffStatus)
      : existing.status;
    const normalizedUsername = username ? normalizeUsername(username) : existing.username;

    if (!normalizedUsername || normalizedUsername.length < 3 || !/^[a-z0-9_]+$/.test(normalizedUsername)) {
      return NextResponse.json({ error: "Enter a valid username" }, { status: 400 });
    }

    const duplicate = await prisma.staffUser.findFirst({
      where: {
        username: normalizedUsername,
        id: { not: id },
      },
    });
    if (duplicate) {
      return NextResponse.json({ error: "Username is already in use" }, { status: 400 });
    }

    const updateData: {
      name?: string;
      username?: string;
      role?: StaffRole;
      permissions?: StaffPermission[];
      status?: StaffStatus;
      passwordHash?: string;
    } = {
      name: typeof name === "string" && name.trim() ? name.trim() : existing.name,
      username: normalizedUsername,
      role: normalizedRole,
      permissions: getNormalizedPermissions(normalizedRole, permissions ?? existing.permissions),
      status: normalizedStatus,
    };

    if (typeof password === "string" && password.trim()) {
      if (password.length < 8) {
        return NextResponse.json({ error: "Password must be at least 8 characters long" }, { status: 400 });
      }
      updateData.passwordHash = await hashPassword(password);
    }

    const account = await prisma.staffUser.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        status: true,
        permissions: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ success: true, account });
  } catch (error) {
    console.error("[Staff Account Update Error]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getStaffSession();
    if (!session || session.role !== StaffRole.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Account id is required" }, { status: 400 });
    }

    if (id === session.id) {
      return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
    }

    await prisma.staffUser.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Staff Account Delete Error]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
