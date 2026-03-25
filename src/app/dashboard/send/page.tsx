import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SendConfession from "@/components/SendConfession";

export default async function SendPage() {
  const user = await getSession();
  if (!user) return null;

  const sentCount = await prisma.confession.count({ where: { senderId: user.id } });

  return <SendConfession sentCount={sentCount} />;
}
