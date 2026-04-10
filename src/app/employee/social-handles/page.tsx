import SocialOwnershipVerificationPanel from "@/components/SocialOwnershipVerificationPanel";
import { prisma } from "@/lib/prisma";
import { requireStaffPermission } from "@/lib/staff-guards";
import { getPlatformProfileUrl } from "@/lib/social-ownership";
import { STAFF_PERMISSIONS } from "@/lib/staff-types";
import { getDisplayUserCode } from "@/lib/utils";

export default async function EmployeeSocialHandlesPage() {
  await requireStaffPermission(STAFF_PERMISSIONS[0]);

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
      title="Social Ownership Queue"
      description="Approve or reject pending ownership requests for Instagram and Snapchat handles."
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
