import { PaymentType, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getDateRangeFromFilter, MARKETING_PURCHASE_TYPES, normalizePhoneWithCountryCode, syncContactUserAndStats } from "@/lib/marketing";
import { prisma } from "@/lib/prisma";
import { getStaffSession } from "@/lib/staff-auth";

function parseTagIds(value: string | null) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function GET(req: NextRequest) {
  try {
    const staff = await getStaffSession();
    if (!staff || staff.role !== "MARKETING_AGENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const profile = await prisma.marketingAgentProfile.findUnique({
      where: { staffUserId: staff.id },
      select: { id: true },
    });

    if (!profile) {
      return NextResponse.json({ error: "Marketing profile not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const tagIds = parseTagIds(searchParams.get("tagIds"));
    const editsSince = getDateRangeFromFilter(searchParams.get("editedInDays"));

    const contacts = await prisma.marketingContact.findMany({
      where: {
        profileId: profile.id,
        isDeleted: false,
        ...(tagIds.length > 0
          ? {
              tags: {
                some: {
                  tagId: { in: tagIds },
                },
              },
            }
          : {}),
        ...(editsSince
          ? {
              editLogs: {
                some: {
                  changedAt: { gte: editsSince },
                },
              },
            }
          : {}),
      },
      include: {
        tags: {
          include: {
            tag: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        editLogs: {
          orderBy: { changedAt: "desc" },
          take: 1,
          select: {
            changedAt: true,
            changedKeys: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const unresolvedPhones = contacts
      .filter((contact) => !contact.userId)
      .map((contact) => contact.phoneNormalized);

    const usersByPhone = unresolvedPhones.length > 0
      ? await prisma.user.findMany({
          where: { phone: { in: unresolvedPhones } },
          select: { id: true, phone: true },
        })
      : [];

    const userIdByPhone = new Map(usersByPhone.map((user) => [user.phone, user.id]));

    const userIds = Array.from(new Set(
      contacts
        .map((contact) => contact.userId ?? userIdByPhone.get(contact.phoneNormalized) ?? null)
        .filter((userId): userId is string => Boolean(userId))
    ));

    const purchaseCounts = userIds.length > 0
      ? await prisma.payment.groupBy({
          by: ["userId", "type"],
          where: {
            userId: { in: userIds },
            status: "SUCCESS",
          },
          _count: {
            _all: true,
          },
        })
      : [];

    const countByUserAndType = new Map<string, number>();
    for (const row of purchaseCounts) {
      countByUserAndType.set(`${row.userId}::${row.type}`, row._count._all);
    }

    const rows = contacts.map((contact) => {
      const effectiveUserId = contact.userId ?? userIdByPhone.get(contact.phoneNormalized) ?? null;
      const purchasesByType = Object.fromEntries(
        MARKETING_PURCHASE_TYPES.map((type) => [
          type,
          effectiveUserId ? countByUserAndType.get(`${effectiveUserId}::${type}`) ?? 0 : 0,
        ])
      ) as Record<PaymentType, number>;

      return {
        id: contact.id,
        name: contact.name,
        countryCode: contact.countryCode,
        phone: contact.phone,
        phoneNormalized: contact.phoneNormalized,
        notes: contact.notes,
        confessionsSent: contact.confessionsSent,
        lockedReceivedConfessions: contact.lockedReceivedConfessions,
        isRegistered: Boolean(effectiveUserId),
        tags: contact.tags.map((item) => item.tag),
        purchasesByType,
        lastEditedAt: contact.editLogs[0]?.changedAt ?? contact.updatedAt,
        lastEditedKeys: contact.editLogs[0]?.changedKeys ?? [],
      };
    });

    return NextResponse.json({ users: rows });
  } catch (error) {
    console.error("[Marketing Users List Error]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const staff = await getStaffSession();
    if (!staff || staff.role !== "MARKETING_AGENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const profile = await prisma.marketingAgentProfile.findUnique({
      where: { staffUserId: staff.id },
      select: { id: true, contactLimit: true },
    });

    if (!profile) {
      return NextResponse.json({ error: "Marketing profile not found" }, { status: 404 });
    }

    const { name, countryCode, phone, notes, tagIds } = await req.json();
    const normalizedName = typeof name === "string" && name.trim() ? name.trim() : "Unnamed contact";
    const normalizedPhone = normalizePhoneWithCountryCode(countryCode ?? "+91", phone ?? "");

    const existing = await prisma.marketingContact.findUnique({
      where: { phoneNormalized: normalizedPhone.phoneNormalized },
      select: {
        id: true,
        profileId: true,
        isDeleted: true,
      },
    });

    if (existing && existing.profileId !== profile.id && !existing.isDeleted) {
      return NextResponse.json({ error: "This contact already belongs to another marketing agent" }, { status: 400 });
    }

    if (!existing || existing.isDeleted || existing.profileId !== profile.id) {
      const activeCount = await prisma.marketingContact.count({
        where: {
          profileId: profile.id,
          isDeleted: false,
        },
      });

      if (activeCount >= profile.contactLimit) {
        return NextResponse.json({ error: "Contact limit reached for your profile" }, { status: 400 });
      }
    }

    const validTagIds = Array.isArray(tagIds)
      ? tagIds.filter((tagId): tagId is string => typeof tagId === "string" && tagId.length > 0)
      : [];

    const contact = await prisma.$transaction(async (tx) => {
      let saved;

      if (!existing) {
        saved = await tx.marketingContact.create({
          data: {
            profileId: profile.id,
            name: normalizedName,
            countryCode: normalizedPhone.countryCode,
            phone: normalizedPhone.phone,
            phoneNormalized: normalizedPhone.phoneNormalized,
            notes: typeof notes === "string" ? notes : null,
          },
        });
      } else {
        saved = await tx.marketingContact.update({
          where: { id: existing.id },
          data: {
            profileId: profile.id,
            name: normalizedName,
            countryCode: normalizedPhone.countryCode,
            phone: normalizedPhone.phone,
            phoneNormalized: normalizedPhone.phoneNormalized,
            notes: typeof notes === "string" ? notes : null,
            isDeleted: false,
            deletedAt: null,
          },
        });
      }

      await tx.marketingContactTag.deleteMany({
        where: { contactId: saved.id },
      });

      if (validTagIds.length > 0) {
        const tags = await tx.marketingAgentTag.findMany({
          where: {
            id: { in: validTagIds },
            profileId: profile.id,
          },
          select: { id: true },
        });

        if (tags.length > 0) {
          await tx.marketingContactTag.createMany({
            data: tags.map((tag) => ({
              contactId: saved.id,
              tagId: tag.id,
            })),
          });
        }
      }

      await tx.marketingContactEditLog.create({
        data: {
          contactId: saved.id,
          changedKeys: ["name", "phone", "notes", "tags"],
        },
      });

      return saved;
    });

    await syncContactUserAndStats(contact.id);

    return NextResponse.json({ success: true, contactId: contact.id });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json({ error: "This contact already belongs to another marketing agent" }, { status: 400 });
    }

    console.error("[Marketing User Create Error]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
