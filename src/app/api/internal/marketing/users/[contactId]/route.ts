import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getChangedKeys, normalizePhoneWithCountryCode, syncContactUserAndStats } from "@/lib/marketing";
import { prisma } from "@/lib/prisma";
import { getStaffSession } from "@/lib/staff-auth";

type Params = {
  params: Promise<{ contactId: string }>;
};

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const staff = await getStaffSession();
    if (!staff || staff.role !== "MARKETING_AGENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { contactId } = await params;
    const profile = await prisma.marketingAgentProfile.findUnique({
      where: { staffUserId: staff.id },
      select: { id: true },
    });

    if (!profile) {
      return NextResponse.json({ error: "Marketing profile not found" }, { status: 404 });
    }

    const contact = await prisma.marketingContact.findFirst({
      where: {
        id: contactId,
        profileId: profile.id,
        isDeleted: false,
      },
      select: {
        id: true,
        name: true,
        countryCode: true,
        phone: true,
        phoneNormalized: true,
        notes: true,
      },
    });

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const { name, countryCode, phone, notes, tagIds } = await req.json();

    const normalizedName = typeof name === "string" && name.trim() ? name.trim() : contact.name;
    const normalizedNotes = typeof notes === "string" ? notes : contact.notes;
    const normalizedPhone = normalizePhoneWithCountryCode(countryCode ?? contact.countryCode, phone ?? contact.phone);

    if (normalizedPhone.phoneNormalized !== contact.phoneNormalized) {
      const existingByPhone = await prisma.marketingContact.findUnique({
        where: { phoneNormalized: normalizedPhone.phoneNormalized },
        select: { id: true, profileId: true, isDeleted: true },
      });

      if (existingByPhone && existingByPhone.id !== contact.id && existingByPhone.profileId !== profile.id && !existingByPhone.isDeleted) {
        return NextResponse.json({ error: "This number already exists in another marketing agent profile" }, { status: 400 });
      }

      if (existingByPhone && existingByPhone.id !== contact.id && existingByPhone.profileId !== profile.id && existingByPhone.isDeleted) {
        return NextResponse.json({ error: "This number was previously linked elsewhere and cannot be reassigned by edit. Remove and add again." }, { status: 400 });
      }
    }

    const validTagIds = Array.isArray(tagIds)
      ? tagIds.filter((tagId): tagId is string => typeof tagId === "string" && tagId.length > 0)
      : [];

    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.marketingContact.update({
        where: { id: contact.id },
        data: {
          name: normalizedName,
          countryCode: normalizedPhone.countryCode,
          phone: normalizedPhone.phone,
          phoneNormalized: normalizedPhone.phoneNormalized,
          notes: normalizedNotes,
        },
      });

      if (Array.isArray(tagIds)) {
        await tx.marketingContactTag.deleteMany({ where: { contactId: contact.id } });
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
                contactId: contact.id,
                tagId: tag.id,
              })),
            });
          }
        }
      }

      const changedKeys = getChangedKeys({
        before: {
          name: contact.name,
          countryCode: contact.countryCode,
          phone: contact.phone,
          notes: contact.notes,
        },
        after: {
          name: saved.name,
          countryCode: saved.countryCode,
          phone: saved.phone,
          notes: saved.notes,
        },
      });

      if (Array.isArray(tagIds)) {
        changedKeys.push("tags");
      }

      if (changedKeys.length > 0) {
        await tx.marketingContactEditLog.create({
          data: {
            contactId: contact.id,
            changedKeys,
          },
        });
      }

      return saved;
    });

    await syncContactUserAndStats(updated.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "This number already exists in another marketing agent profile" }, { status: 400 });
    }

    console.error("[Marketing User Update Error]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const staff = await getStaffSession();
    if (!staff || staff.role !== "MARKETING_AGENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { contactId } = await params;
    const profile = await prisma.marketingAgentProfile.findUnique({
      where: { staffUserId: staff.id },
      select: { id: true },
    });

    if (!profile) {
      return NextResponse.json({ error: "Marketing profile not found" }, { status: 404 });
    }

    const contact = await prisma.marketingContact.findFirst({
      where: {
        id: contactId,
        profileId: profile.id,
        isDeleted: false,
      },
      select: { id: true },
    });

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    await prisma.marketingContact.update({
      where: { id: contact.id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Marketing User Delete Error]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
