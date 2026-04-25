export const STAFF_ROLES = ["ADMIN", "EMPLOYEE", "MARKETING_AGENT"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const STAFF_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export type StaffStatus = (typeof STAFF_STATUSES)[number];

export const STAFF_PERMISSIONS = [
  "MANAGE_USERS",
  "MANAGE_PAYMENTS",
  "MANAGE_CONFESSIONS",
] as const;
export type StaffPermission = (typeof STAFF_PERMISSIONS)[number];
