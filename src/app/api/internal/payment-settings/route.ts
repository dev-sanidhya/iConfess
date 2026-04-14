import { NextRequest, NextResponse } from "next/server";
import { PaymentServiceKey, StaffPermission } from "@prisma/client";
import { getAppSettings, updateAppSettings } from "@/lib/app-settings";
import { getPaymentCatalog, upsertPaymentServiceConfig } from "@/lib/payment-catalog.server";
import { getStaffSession, hasPermission } from "@/lib/staff-auth";

function canManage(staff: Awaited<ReturnType<typeof getStaffSession>>) {
  return Boolean(
    staff && hasPermission(staff.permissions, staff.role, StaffPermission.MANAGE_PAYMENTS)
  );
}

export async function GET() {
  try {
    const staff = await getStaffSession();
    if (!canManage(staff)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [catalog, appSettings] = await Promise.all([
      getPaymentCatalog(),
      getAppSettings(),
    ]);
    return NextResponse.json({ ...catalog, appSettings });
  } catch (error) {
    console.error("[Internal Payment Settings GET Error]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const staff = await getStaffSession();
    if (!canManage(staff)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const appSettingsPayload = body.appSettings;

    if (appSettingsPayload && typeof appSettingsPayload === "object" && !Array.isArray(appSettingsPayload)) {
      const nextSettings = await updateAppSettings({
        instagramId:
          typeof appSettingsPayload.instagramId === "string"
            ? appSettingsPayload.instagramId.trim().replace(/^@+/, "")
            : undefined,
        snapchatId:
          typeof appSettingsPayload.snapchatId === "string"
            ? appSettingsPayload.snapchatId.trim().replace(/^@+/, "")
            : undefined,
        contactEmail:
          typeof appSettingsPayload.contactEmail === "string"
            ? appSettingsPayload.contactEmail.trim()
            : undefined,
        feedbackEmail:
          typeof appSettingsPayload.feedbackEmail === "string"
            ? appSettingsPayload.feedbackEmail.trim()
            : undefined,
      });

      const catalog = await getPaymentCatalog();
      return NextResponse.json({ ...catalog, appSettings: nextSettings });
    }

    const service = body.service;
    const amount = Number.parseInt(String(body.amount), 10);
    const qrCodeDataUrl =
      typeof body.qrCodeDataUrl === "string"
        ? body.qrCodeDataUrl
        : body.qrCodeDataUrl === null
          ? null
          : undefined;

    if (!Object.values(PaymentServiceKey).includes(service as PaymentServiceKey)) {
      return NextResponse.json({ error: "Invalid payment service" }, { status: 400 });
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Enter a valid amount" }, { status: 400 });
    }

    if (typeof qrCodeDataUrl === "string" && !qrCodeDataUrl.startsWith("data:image/")) {
      return NextResponse.json({ error: "QR code must be an image" }, { status: 400 });
    }

    await upsertPaymentServiceConfig({
      service: service as PaymentServiceKey,
      amount,
      qrCodeDataUrl,
    });

    const [catalog, appSettings] = await Promise.all([
      getPaymentCatalog(),
      getAppSettings(),
    ]);
    return NextResponse.json({ ...catalog, appSettings });
  } catch (error) {
    console.error("[Internal Payment Settings PATCH Error]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
