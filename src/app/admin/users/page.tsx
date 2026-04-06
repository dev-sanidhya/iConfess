import UsersManagementPanel from "@/components/UsersManagementPanel";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/staff-guards";

type AdminUsersPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  await requireAdmin();
  const params = await searchParams;
  const phoneQuery = typeof params.phone === "string" ? params.phone.trim() : "";

  const users = await prisma.user.findMany({
    where: phoneQuery
      ? {
          phone: {
            contains: phoneQuery,
          },
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          sentConfessions: true,
          receivedConfessions: true,
          payments: true,
        },
      },
    },
    take: 100,
  });

  return <UsersManagementPanel title="Users Management" users={users} phoneQuery={phoneQuery} />;
}
