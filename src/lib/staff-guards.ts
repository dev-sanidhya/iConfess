import { redirect } from "next/navigation";
import { getStaffSession, hasPermission } from "@/lib/staff-auth";
import type { StaffPermission } from "@/lib/staff-types";

export async function requireAdmin() {
  const staff = await getStaffSession();
  if (!staff) {
    redirect("/staff/login");
  }

  if (staff.role !== "ADMIN") {
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
    redirect(staff.role === "ADMIN" ? "/admin" : "/employee");
  }

  return staff;
}
