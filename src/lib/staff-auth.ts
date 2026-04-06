import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  type StaffPermission,
  type StaffRole,
} from "@/lib/staff-types";

const STAFF_COOKIE_NAME = "iconfess_staff_token";
const STAFF_JWT_SECRET = process.env.STAFF_JWT_SECRET ?? process.env.JWT_SECRET!;

type StaffTokenPayload = {
  staffId: string;
  role: StaffRole;
};

export function signStaffToken(staffId: string, role: StaffRole) {
  return jwt.sign({ staffId, role }, STAFF_JWT_SECRET, { expiresIn: "30d" });
}

export function verifyStaffToken(token: string): StaffTokenPayload | null {
  try {
    return jwt.verify(token, STAFF_JWT_SECRET) as StaffTokenPayload;
  } catch {
    return null;
  }
}

export async function getStaffSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(STAFF_COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = verifyStaffToken(token);
  if (!payload) return null;

  const staff = await prisma.staffUser.findUnique({
    where: { id: payload.staffId },
  });

  if (!staff || staff.status !== "ACTIVE") {
    return null;
  }

  return staff;
}

export function getStaffCookieName() {
  return STAFF_COOKIE_NAME;
}

export function hasPermission(
  permissions: StaffPermission[],
  role: StaffRole,
  requiredPermission: StaffPermission
) {
  if (role === "ADMIN") {
    return true;
  }

  return permissions.includes(requiredPermission);
}

export async function ensureStaffPermission(permission: StaffPermission) {
  const staff = await getStaffSession();
  if (!staff) {
    return null;
  }

  if (!hasPermission(staff.permissions, staff.role, permission)) {
    return false;
  }

  return staff;
}

export async function hasAnyAdmin() {
  const adminCount = await prisma.staffUser.count({
    where: {
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  return adminCount > 0;
}
