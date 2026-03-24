import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPhone(phone: string): string {
  return phone.startsWith("+91") ? phone : `+91${phone}`;
}

export function maskPhone(phone: string): string {
  const cleaned = phone.replace("+91", "");
  return `+91 ${cleaned.slice(0, 2)}****${cleaned.slice(-2)}`;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
