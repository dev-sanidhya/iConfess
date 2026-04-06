import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SendConfession from "@/components/SendConfession";
import { buildSharedProfileOptions } from "@/lib/shared-profile-context";

export default async function SendPage() {
  const user = await getSession();
  if (!user) return null;

  const sentCount = await prisma.confession.count({ where: { senderId: user.id } });
  const sharedProfileOptions = buildSharedProfileOptions(user);

  return (
    <SendConfession
      sentCount={sentCount}
      sharedProfileOptions={sharedProfileOptions}
      currentUser={{
        id: user.id,
        name: user.name,
        phone: user.phone,
        instagramHandle: user.instagramHandle,
        snapchatHandle: user.snapchatHandle,
        gender: user.gender,
      }}
    />
  );
}
