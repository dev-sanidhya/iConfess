import { NextResponse } from "next/server";
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
      select: { id: true, agentId: true },
    });

    if (!profile) {
      return NextResponse.json({ error: "Marketing profile not found" }, { status: 404 });
    }

    const contacts = await prisma.marketingContact.findMany({
      where: {
        profileId: profile.id,
        isDeleted: false,
      },
      orderBy: { name: "asc" },
      select: {
        name: true,
        countryCode: true,
        phone: true,
      },
    });

    const rows = [
      "Name,Country Code,Phone",
      ...contacts.map((contact) => `"${contact.name.replace(/\"/g, "\"\"")}","${contact.countryCode}","${contact.phone}"`),
    ];

    const csv = rows.join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=marketing-contacts-${profile.agentId}.csv`,
      },
    });
  } catch (error) {
    console.error("[Marketing Export Error]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
