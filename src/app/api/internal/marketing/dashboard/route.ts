import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStaffSession } from "@/lib/staff-auth";

function getRange(params: URLSearchParams) {
  const period = params.get("period") ?? "month";
  const now = new Date();

  if (period === "week") {
    const start = new Date(now);
    start.setDate(now.getDate() - 7);
    return { start, end: now };
  }

  if (period === "custom") {
    const start = params.get("start");
    const end = params.get("end");
    if (start && end) {
      const parsedStart = new Date(start);
      const parsedEnd = new Date(end);
      if (!Number.isNaN(parsedStart.getTime()) && !Number.isNaN(parsedEnd.getTime())) {
        return { start: parsedStart, end: parsedEnd };
      }
    }
  }

  const start = new Date(now);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  return { start, end: now };
}

export async function GET(req: NextRequest) {
  try {
    const staff = await getStaffSession();
    if (!staff || staff.role !== "MARKETING_AGENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const profile = await prisma.marketingAgentProfile.findUnique({
      where: { staffUserId: staff.id },
      select: {
        id: true,
        agentId: true,
        contactLimit: true,
        revenueSharePercent: true,
      },
    });

    if (!profile) {
      return NextResponse.json({ error: "Marketing profile not found" }, { status: 404 });
    }

    const { start, end } = getRange(new URL(req.url).searchParams);

    const [activeContacts, periodAggregate, lifetimeAggregate] = await Promise.all([
      prisma.marketingContact.count({
        where: { profileId: profile.id, isDeleted: false },
      }),
      prisma.marketingRevenueSnapshot.aggregate({
        where: {
          profileId: profile.id,
          purchaseCreatedAt: {
            gte: start,
            lte: end,
          },
        },
        _sum: {
          grossAmount: true,
          agentShareAmount: true,
        },
        _count: {
          _all: true,
        },
      }),
      prisma.marketingRevenueSnapshot.aggregate({
        where: { profileId: profile.id },
        _sum: {
          agentShareAmount: true,
          grossAmount: true,
        },
      }),
    ]);

    return NextResponse.json({
      profile,
      dashboard: {
        periodStart: start,
        periodEnd: end,
        contactsHandled: activeContacts,
        periodPurchasesCount: periodAggregate._count._all,
        periodGrossRevenue: periodAggregate._sum.grossAmount ?? 0,
        periodAgentEarnings: Number(periodAggregate._sum.agentShareAmount ?? 0),
        totalGrossRevenue: lifetimeAggregate._sum.grossAmount ?? 0,
        totalAgentEarnings: Number(lifetimeAggregate._sum.agentShareAmount ?? 0),
      },
    });
  } catch (error) {
    console.error("[Marketing Dashboard Error]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
