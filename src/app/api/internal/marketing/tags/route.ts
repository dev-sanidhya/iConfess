import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStaffSession } from "@/lib/staff-auth";

export async function GET() {
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

    const globalTags = await prisma.marketingGlobalTag.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });

    const agentTags = await prisma.marketingAgentTag.findMany({
      where: { profileId: profile.id },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        sourceGlobalTagId: true,
      },
    });

    return NextResponse.json({ globalTags, agentTags });
  } catch (error) {
    console.error("[Marketing Tags List Error]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
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
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Tag id is required" }, { status: 400 });
    }

    const tag = await prisma.marketingAgentTag.findFirst({
      where: {
        id,
        profileId: profile.id,
      },
      select: { id: true },
    });

    if (!tag) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    await prisma.marketingAgentTag.delete({
      where: { id: tag.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Marketing Tag Delete Error]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const staff = await getStaffSession();
    if (!staff || staff.role !== "MARKETING_AGENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { name, globalTagId } = await req.json();
    const profile = await prisma.marketingAgentProfile.findUnique({
      where: { staffUserId: staff.id },
      select: { id: true },
    });

    if (!profile) {
      return NextResponse.json({ error: "Marketing profile not found" }, { status: 404 });
    }

    let resolvedName = typeof name === "string" ? name.trim() : "";
    let sourceGlobalTagId: string | null = null;

    if (typeof globalTagId === "string" && globalTagId) {
      const globalTag = await prisma.marketingGlobalTag.findUnique({
        where: { id: globalTagId },
      });

      if (!globalTag) {
        return NextResponse.json({ error: "Global tag not found" }, { status: 404 });
      }

      sourceGlobalTagId = globalTag.id;
      resolvedName = globalTag.name;
    }

    if (!resolvedName) {
      return NextResponse.json({ error: "Tag name is required" }, { status: 400 });
    }

    const tag = await prisma.marketingAgentTag.upsert({
      where: {
        profileId_name: {
          profileId: profile.id,
          name: resolvedName,
        },
      },
      update: {
        sourceGlobalTagId,
      },
      create: {
        profileId: profile.id,
        name: resolvedName,
        sourceGlobalTagId,
      },
      select: {
        id: true,
        name: true,
        sourceGlobalTagId: true,
      },
    });

    return NextResponse.json({ success: true, tag });
  } catch (error) {
    console.error("[Marketing Tag Create Error]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
