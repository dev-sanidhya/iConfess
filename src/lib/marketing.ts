import "server-only";
import { PaymentStatus, type PaymentType, Prisma } from "@prisma/client";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";

type Tx = Prisma.TransactionClient;

export type ParsedContact = {
  name: string;
  countryCode: string;
  phone: string;
  phoneNormalized: string;
};

export const DEFAULT_MARKETING_CONTACT_LIMIT = 500;

export function normalizeCountryCode(raw: string) {
  const cleaned = String(raw ?? "").replace(/[^\d+]/g, "");
  if (!cleaned) {
    return "+91";
  }

  if (cleaned.startsWith("+")) {
    return `+${cleaned.slice(1).replace(/\D/g, "")}`;
  }

  return `+${cleaned.replace(/\D/g, "")}`;
}

export function normalizePhoneDigits(raw: string) {
  return String(raw ?? "").replace(/\D/g, "");
}

export function normalizePhoneWithCountryCode(countryCode: string, phone: string) {
  const normalizedCountryCode = normalizeCountryCode(countryCode);
  const digits = normalizePhoneDigits(phone);
  if (!digits) {
    throw new Error("Phone number is required");
  }

  return {
    countryCode: normalizedCountryCode,
    phone: digits,
    phoneNormalized: `${normalizedCountryCode}${digits}`,
  };
}

export async function getMarketingProfileByStaffUserId(staffUserId: string) {
  return prisma.marketingAgentProfile.findUnique({
    where: { staffUserId },
    include: {
      staffUser: {
        select: {
          id: true,
          name: true,
          username: true,
          role: true,
          status: true,
        },
      },
    },
  });
}

function monthKeyFromDate(date: Date) {
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  return `${date.getUTCFullYear()}-${month}`;
}

export async function ensureMarketingRevenueSnapshotForPayment(paymentId: string, db: Tx | typeof prisma = prisma) {
  const existing = await db.marketingRevenueSnapshot.findUnique({
    where: { paymentId },
    select: { id: true },
  });

  if (existing) {
    return existing;
  }

  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    select: {
      id: true,
      userId: true,
      amount: true,
      type: true,
      status: true,
      createdAt: true,
    },
  });

  if (!payment || payment.status !== PaymentStatus.SUCCESS) {
    return null;
  }

  const contact = await db.marketingContact.findFirst({
    where: {
      userId: payment.userId,
      isDeleted: false,
    },
    include: {
      profile: {
        select: {
          id: true,
          revenueSharePercent: true,
        },
      },
    },
  });

  if (!contact) {
    return null;
  }

  const shareAmount = Number(((payment.amount * contact.profile.revenueSharePercent) / 100).toFixed(2));
  return db.marketingRevenueSnapshot.create({
    data: {
      paymentId: payment.id,
      profileId: contact.profileId,
      contactId: contact.id,
      userId: payment.userId,
      grossAmount: payment.amount,
      revenueSharePercent: contact.profile.revenueSharePercent,
      agentShareAmount: shareAmount,
      purchaseType: payment.type,
      purchaseCreatedAt: payment.createdAt,
      monthKey: monthKeyFromDate(payment.createdAt),
    },
  });
}

export async function syncContactUserAndStats(contactId: string, db: Tx | typeof prisma = prisma) {
  const contact = await db.marketingContact.findUnique({
    where: { id: contactId },
    select: {
      id: true,
      phoneNormalized: true,
    },
  });

  if (!contact) {
    return null;
  }

  const user = await db.user.findUnique({
    where: { phone: contact.phoneNormalized },
    select: { id: true },
  });

  let confessionsSent = 0;
  let lockedReceivedConfessions = 0;

  if (user) {
    const [sentCount, unlockedCount] = await Promise.all([
      db.confession.count({ where: { senderId: user.id } }),
      db.unlockedCard.count({ where: { userId: user.id } }),
    ]);
    confessionsSent = sentCount;
    lockedReceivedConfessions = unlockedCount;
  }

  return db.marketingContact.update({
    where: { id: contact.id },
    data: {
      userId: user?.id ?? null,
      confessionsSent,
      lockedReceivedConfessions,
    },
  });
}

function extractLinesFromCsv(csvText: string) {
  return csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function guessNameAndPhoneFromLine(line: string) {
  const phoneMatch = line.match(/(\+?\d[\d\s\-()]{6,}\d)/);
  if (!phoneMatch) {
    return null;
  }

  const rawPhone = phoneMatch[1];
  const beforePhone = line.slice(0, phoneMatch.index ?? 0).trim();
  const cleanedName = beforePhone
    .replace(/[,:;|]+$/g, "")
    .replace(/^[-\d\s]+/g, "")
    .trim();

  return {
    name: cleanedName || "Unnamed contact",
    rawPhone,
  };
}

function normalizeImportedContact(name: string, rawPhone: string) {
  const hasCountryPrefix = /^\s*\+\d+/.test(rawPhone);
  const countryCode = hasCountryPrefix
    ? normalizeCountryCode(rawPhone.replace(/[^+\d]/g, "").replace(/(\+\d{1,4}).*/, "$1"))
    : "+91";

  const digits = normalizePhoneDigits(rawPhone);
  if (digits.length < 7) {
    return null;
  }

  const localPhone = hasCountryPrefix
    ? digits.slice(countryCode.replace("+", "").length)
    : digits;

  if (!localPhone) {
    return null;
  }

  const normalized = normalizePhoneWithCountryCode(countryCode, localPhone);
  return {
    name: name.trim() || "Unnamed contact",
    ...normalized,
  };
}

function dedupeContacts(contacts: ParsedContact[]) {
  const merged = new Map<string, ParsedContact>();
  for (const contact of contacts) {
    const existing = merged.get(contact.phoneNormalized);
    if (!existing) {
      merged.set(contact.phoneNormalized, contact);
      continue;
    }

    if ((!existing.name || existing.name === "Unnamed contact") && contact.name) {
      merged.set(contact.phoneNormalized, contact);
    }
  }

  return [...merged.values()];
}

async function extractTextFromPdf(bytes: Buffer) {
  const pdf2json = await import("pdf2json");
  const PDFParser = pdf2json.default;

  return new Promise<string>((resolve, reject) => {
    const parser = new PDFParser();

    parser.on("pdfParser_dataError", (error: unknown) => {
      reject(new Error(`Failed to parse PDF: ${String(error)}`));
    });

    parser.on("pdfParser_dataReady", (data: unknown) => {
      try {
        const record = data as {
          Pages?: Array<{
            Texts?: Array<{
              R?: Array<{ T?: string }>;
            }>;
          }>;
        };

        const text = (record.Pages ?? [])
          .flatMap((page) => page.Texts ?? [])
          .flatMap((textItem) => textItem.R ?? [])
          .map((run) => {
            try {
              return decodeURIComponent(run.T ?? "");
            } catch {
              return run.T ?? "";
            }
          })
          .join(" ");

        resolve(text);
      } catch (error) {
        reject(error);
      }
    });

    parser.parseBuffer(bytes);
  });
}

export async function extractContactsFromUploadedFile(file: File) {
  const fileName = file.name.toLowerCase();
  const bytes = Buffer.from(await file.arrayBuffer());

  let extractedText = "";

  if (fileName.endsWith(".csv")) {
    extractedText = bytes.toString("utf8");
  } else if (fileName.endsWith(".xlsx")) {
    const workbook = XLSX.read(bytes, { type: "buffer" });
    extractedText = workbook.SheetNames.map((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      return XLSX.utils.sheet_to_csv(sheet);
    }).join("\n");
  } else if (fileName.endsWith(".docx")) {
    const result = await mammoth.extractRawText({ buffer: bytes });
    extractedText = result.value;
  } else if (fileName.endsWith(".pdf")) {
    extractedText = await extractTextFromPdf(bytes);
  } else {
    throw new Error("Unsupported file format. Use csv, xlsx, docx, or pdf.");
  }

  const lines = extractLinesFromCsv(extractedText);
  const parsed = lines
    .map(guessNameAndPhoneFromLine)
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .map((item) => normalizeImportedContact(item.name, item.rawPhone))
    .filter((item): item is ParsedContact => Boolean(item));

  return dedupeContacts(parsed);
}

export async function upsertMarketingContacts(params: {
  profileId: string;
  contacts: ParsedContact[];
}) {
  const profile = await prisma.marketingAgentProfile.findUnique({
    where: { id: params.profileId },
    select: { id: true, contactLimit: true },
  });

  if (!profile) {
    throw new Error("Marketing profile not found");
  }

  const activeCount = await prisma.marketingContact.count({
    where: { profileId: params.profileId, isDeleted: false },
  });

  const incomingUnique = dedupeContacts(params.contacts);
  const knownContacts = await prisma.marketingContact.findMany({
    where: {
      phoneNormalized: { in: incomingUnique.map((contact) => contact.phoneNormalized) },
    },
    select: {
      id: true,
      phoneNormalized: true,
      profileId: true,
      isDeleted: true,
    },
  });

  const byPhone = new Map(knownContacts.map((contact) => [contact.phoneNormalized, contact]));
  const additionsNeeded = incomingUnique.filter((contact) => {
    const existing = byPhone.get(contact.phoneNormalized);
    if (!existing) {
      return true;
    }

    if (existing.profileId !== params.profileId && !existing.isDeleted) {
      return false;
    }

    return existing.profileId !== params.profileId || existing.isDeleted;
  }).length;

  if (activeCount + additionsNeeded > profile.contactLimit) {
    throw new Error("Contact limit exceeded for this marketing agent");
  }

  let inserted = 0;
  let merged = 0;

  for (const contact of incomingUnique) {
    const existing = byPhone.get(contact.phoneNormalized);

    if (!existing) {
      const created = await prisma.marketingContact.create({
        data: {
          profileId: params.profileId,
          name: contact.name,
          countryCode: contact.countryCode,
          phone: contact.phone,
          phoneNormalized: contact.phoneNormalized,
        },
      });
      inserted += 1;
      await syncContactUserAndStats(created.id);
      continue;
    }

    if (existing.profileId !== params.profileId && !existing.isDeleted) {
      continue;
    }

    const updated = await prisma.marketingContact.update({
      where: { id: existing.id },
      data: {
        profileId: params.profileId,
        name: contact.name,
        countryCode: contact.countryCode,
        phone: contact.phone,
        phoneNormalized: contact.phoneNormalized,
        isDeleted: false,
        deletedAt: null,
      },
    });

    merged += 1;
    await syncContactUserAndStats(updated.id);
  }

  return { inserted, merged };
}

export function getChangedKeys(input: {
  before: {
    name: string;
    countryCode: string;
    phone: string;
    notes: string | null;
  };
  after: {
    name: string;
    countryCode: string;
    phone: string;
    notes: string | null;
  };
}) {
  const keys: string[] = [];
  if (input.before.name !== input.after.name) keys.push("name");
  if (input.before.countryCode !== input.after.countryCode) keys.push("countryCode");
  if (input.before.phone !== input.after.phone) keys.push("phone");
  if ((input.before.notes ?? "") !== (input.after.notes ?? "")) keys.push("notes");
  return keys;
}

export function getDateRangeFromFilter(filter: string | null) {
  if (!filter) {
    return null;
  }

  const days = Number.parseInt(filter, 10);
  if (!Number.isFinite(days) || days <= 0) {
    return null;
  }

  const since = new Date();
  since.setDate(since.getDate() - days);
  return since;
}

export const MARKETING_PURCHASE_TYPES: PaymentType[] = [
  "SEND_CONFESSION",
  "UNLOCK_CONFESSION_CARD",
  "UNLOCK_CONFESSION_PAGE",
  "UNLOCK_PROFILE_INSIGHTS",
  "SELF_CONFESSION",
  "IDENTITY_REVEAL",
];
