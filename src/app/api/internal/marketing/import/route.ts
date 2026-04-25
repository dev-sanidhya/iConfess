import { NextRequest, NextResponse } from "next/server";
import { extractContactsFromUploadedFile, upsertMarketingContacts } from "@/lib/marketing";
import { prisma } from "@/lib/prisma";
import { getStaffSession } from "@/lib/staff-auth";

export async function POST(req: NextRequest) {
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

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    const extractedContacts = await extractContactsFromUploadedFile(file);
    if (extractedContacts.length === 0) {
      return NextResponse.json({ error: "No contacts were detected in the uploaded file" }, { status: 400 });
    }

    const result = await upsertMarketingContacts({
      profileId: profile.id,
      contacts: extractedContacts,
    });

    return NextResponse.json({
      success: true,
      extracted: extractedContacts.length,
      inserted: result.inserted,
      merged: result.merged,
    });
  } catch (error) {
    console.error("[Marketing Import Error]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}
