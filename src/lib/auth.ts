import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
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

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        college: true,
        school: true,
        workplace: true,
        gym: true,
        neighbourhood: true,
        pendingSocialOwnershipRequests: true,
      },
    });

    return user;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientInitializationError ||
      error instanceof Prisma.PrismaClientKnownRequestError ||
      error instanceof Prisma.PrismaClientUnknownRequestError
    ) {
      console.error("Failed to load session from database.", error);
      return null;
    }

    throw error;
  }
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

const PUBLIC_USER_CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export function generatePublicUserCode(length = 6) {
  return Array.from({ length }, () => PUBLIC_USER_CODE_ALPHABET[randomInt(PUBLIC_USER_CODE_ALPHABET.length)]).join("");
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export const COOKIE_NAME_EXPORT = COOKIE_NAME;
