import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

const JWT_SECRET = process.env.JWT_SECRET!;
const COOKIE_NAME = "iconfess_token";

export function signToken(userId: string) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: {
      college: true,
      school: true,
      workplace: true,
      gym: true,
      neighbourhood: true,
    },
  });
  return user;
}

export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export function normalizeSocialHandle(handle: string) {
  const normalized = handle.trim().replace(/^@+/, "").toLowerCase();

  if (!normalized) return null;
  if (["na", "n/a", "na handle", "notavailable", "not_available"].includes(normalized)) {
    return null;
  }

  return normalized;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export const COOKIE_NAME_EXPORT = COOKIE_NAME;
