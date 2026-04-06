import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SendConfession from "@/components/SendConfession";
import { buildSharedProfileOptionsFromUser } from "@/lib/shared-profile-context";
import { countSentConfessionsToOthers } from "@/lib/confessions";

export default async function SendPage() {
  const user = await getSession();
  if (!user) return null;

  const sentCount = await countSentConfessionsToOthers(user.id, prisma);
  const sharedProfileOptions = buildSharedProfileOptionsFromUser(user);

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
