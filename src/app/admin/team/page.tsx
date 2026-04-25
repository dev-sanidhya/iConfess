import TeamManagement from "@/components/TeamManagement";
import { prisma } from "@/lib/prisma";

export default async function AdminTeamPage() {
  const accounts = await prisma.staffUser.findMany({
    orderBy: [{ role: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      username: true,
      role: true,
      status: true,
      permissions: true,
      createdAt: true,
      updatedAt: true,
      marketingAgentProfile: {
        select: {
          agentId: true,
          contactLimit: true,
          revenueSharePercent: true,
        },
      },
    },
  });

  return (
    <div className="py-6">
      <TeamManagement initialAccounts={accounts} />
    </div>
  );
}
