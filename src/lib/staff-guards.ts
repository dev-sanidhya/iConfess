import { redirect } from "next/navigation";
import { StaffPermission, StaffRole } from "@prisma/client";
import { getStaffSession, hasPermission } from "@/lib/staff-auth";

export async function requireAdmin() {
  const staff = await getStaffSession();
  if (!staff) {
    redirect("/staff/login");
  }

  if (staff.role !== StaffRole.ADMIN) {
    redirect("/employee");
  }

  return staff;
}

export async function requireStaffPermission(permission: StaffPermission) {
  const staff = await getStaffSession();
  if (!staff) {
    redirect("/staff/login");
  }

  if (!hasPermission(staff.permissions, staff.role, permission)) {
    redirect(staff.role === StaffRole.ADMIN ? "/admin" : "/employee");
  }

  return staff;
}
