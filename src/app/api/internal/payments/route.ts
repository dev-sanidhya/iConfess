import { NextRequest, NextResponse } from "next/server";
import { PaymentStatus, StaffPermission } from "@prisma/client";
import { applySuccessfulPayment } from "@/lib/payments";
import { prisma } from "@/lib/prisma";
import { getStaffSession, hasPermission } from "@/lib/staff-auth";

export async function PATCH(req: NextRequest) {
  try {
    const staff = await getStaffSession();
    if (!staff || !hasPermission(staff.permissions, staff.role, StaffPermission.MANAGE_PAYMENTS)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id, status } = await req.json();
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Payment id is required" }, { status: 400 });
    }

    if (!Object.values(PaymentStatus).includes(status as PaymentStatus)) {
      return NextResponse.json({ error: "Invalid payment status" }, { status: 400 });
    }

    const currentPayment = await prisma.payment.findUnique({
      where: { id },
      select: { status: true },
    });

    if (!currentPayment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    await prisma.payment.update({
      where: { id },
      data: {
        status: status as PaymentStatus,
        managedByStaffId: staff.id,
      },
    });

    if (status === PaymentStatus.SUCCESS) {
      try {
        await applySuccessfulPayment(id);
      } catch (applyError) {
        await prisma.payment.update({
          where: { id },
          data: {
            status: currentPayment.status,
            managedByStaffId: staff.id,
          },
        });
        throw applyError;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Payments Update Error]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
