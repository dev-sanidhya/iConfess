import SocialOwnershipVerificationPanel from "@/components/SocialOwnershipVerificationPanel";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/staff-guards";
import { getPlatformProfileUrl } from "@/lib/social-ownership";
import { getDisplayUserCode } from "@/lib/utils";

export default async function AdminSocialHandlesPage() {
  await requireAdmin();

  const requests = await prisma.pendingSocialOwnershipRequest.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      user: {
        select: {
          id: true,
          publicCode: true,
          name: true,
        },
      },
    },
  });

  return (
    <SocialOwnershipVerificationPanel
      title="Social Ownership Verification"
      description="Review pending ownership requests. Matching the pasted 6-character user ID auto-accepts the request; a mismatch auto-rejects it."
      requests={requests.map((request) => ({
        id: request.id,
        platform: request.platform,
        submittedHandle: request.submittedHandle.replace(/^@+/, ""),
        profileUrl: getPlatformProfileUrl(request.platform, request.normalizedHandle),
        userName: request.user.name,
        userIdCode: getDisplayUserCode(request.user.id, request.user.publicCode),
      }))}
    />
  );
}
