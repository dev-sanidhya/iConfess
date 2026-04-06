import ConfessionsManagementPanel from "@/components/ConfessionsManagementPanel";
import { ConfessionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/staff-guards";

type AdminConfessionsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminConfessionsPage({ searchParams }: AdminConfessionsPageProps) {
  await requireAdmin();
  const params = await searchParams;
  const phoneQuery = typeof params.phone === "string" ? params.phone.trim() : "";
  const statusQuery =
    typeof params.status === "string" && Object.values(ConfessionStatus).includes(params.status as ConfessionStatus)
      ? (params.status as ConfessionStatus)
      : "";

  const confessions = await prisma.confession.findMany({
    where: {
      ...(statusQuery ? { status: statusQuery } : {}),
      ...(phoneQuery
        ? {
            OR: [
              { sender: { phone: { contains: phoneQuery } } },
              { target: { phone: { contains: phoneQuery } } },
              { targetPhone: { contains: phoneQuery } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      sender: {
        select: {
          name: true,
          phone: true,
        },
      },
      target: {
        select: {
          name: true,
          phone: true,
        },
      },
    },
    take: 100,
  });

  return (
    <ConfessionsManagementPanel
      title="Confessions Management"
      confessions={confessions}
      phoneQuery={phoneQuery}
      statusQuery={statusQuery}
    />
  );
}
