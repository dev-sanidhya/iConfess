import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStaffSession } from "@/lib/staff-auth";

async function ensureAdmin() {
  const staff = await getStaffSession();
  if (!staff || staff.role !== "ADMIN") {
    return null;
  }

  return staff;
}

export async function GET() {
  try {
    const admin = await ensureAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const tags = await prisma.marketingGlobalTag.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ tags });
  } catch (error) {
    console.error("[Marketing Global Tags List Error]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await ensureAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { name } = await req.json();
    const normalizedName = typeof name === "string" ? name.trim() : "";

    if (!normalizedName) {
      return NextResponse.json({ error: "Tag name is required" }, { status: 400 });
    }

    const tag = await prisma.marketingGlobalTag.upsert({
      where: { name: normalizedName },
      create: { name: normalizedName },
      update: {},
    });

    const profiles = await prisma.marketingAgentProfile.findMany({
      select: { id: true },
    });

    await Promise.all(
      profiles.map((profile) =>
        prisma.marketingAgentTag.upsert({
          where: {
            profileId_name: {
              profileId: profile.id,
              name: tag.name,
            },
          },
          update: {
            sourceGlobalTagId: tag.id,
          },
          create: {
            profileId: profile.id,
            name: tag.name,
            sourceGlobalTagId: tag.id,
          },
        })
      )
    );

    return NextResponse.json({ success: true, tag });
  } catch (error) {
    console.error("[Marketing Global Tag Create Error]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = await ensureAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id, name } = await req.json();
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Tag id is required" }, { status: 400 });
    }

    const normalizedName = typeof name === "string" ? name.trim() : "";
    if (!normalizedName) {
      return NextResponse.json({ error: "Tag name is required" }, { status: 400 });
    }

    const tag = await prisma.marketingGlobalTag.update({
      where: { id },
      data: { name: normalizedName },
    });

    return NextResponse.json({ success: true, tag });
  } catch (error) {
    console.error("[Marketing Global Tag Update Error]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const admin = await ensureAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Tag id is required" }, { status: 400 });
    }

    await prisma.marketingGlobalTag.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Marketing Global Tag Delete Error]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
