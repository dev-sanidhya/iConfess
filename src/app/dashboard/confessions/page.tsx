import { getSession } from "@/lib/auth";
import ConfessionsInbox from "@/components/ConfessionsInbox";
import { prisma } from "@/lib/prisma";
import { formatSharedProfileDetails, getStoredSharedProfileSnapshot } from "@/lib/shared-profile-context";
import { PaymentStatus } from "@prisma/client";
import { buildSelfClaimSnapshot, confessionMatchesSelfClaim, dedupeSentConfessions } from "@/lib/confessions";
import { dbSupportsIdentityRevealPaymentType } from "@/lib/reveal-identity";
import { findMatches, getSearchResultByIds, getConciseCategorySummary } from "@/lib/matching";
import { isFullDetailShadowProfile } from "@/lib/shadow-profiles";

function buildAnonymousId(value: string) {
  return `AID-${value.slice(-6).toUpperCase()}`;
}

function buildTrashAnonymousId(confessionId: string) {
  return `AID-${confessionId.slice(-6).toUpperCase()}`;
}

function getStringDetail(details: Record<string, unknown>, key: string) {
  const value = details[key];
  return typeof value === "string" ? value : "";
}

function getPaymentConfessionId(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const confessionId = (metadata as Record<string, unknown>).confessionId;
  return typeof confessionId === "string" ? confessionId : null;
}

function buildEnteredRecipientName(details: Record<string, unknown>) {
  const fullName = getStringDetail(details, "fullName").trim();
  if (fullName) return fullName;

  const composedName = [
    getStringDetail(details, "firstName").trim(),
    getStringDetail(details, "lastName").trim(),
  ].filter(Boolean).join(" ").trim();

  return composedName || null;
}

function buildEnteredRecipientContext(
  location: string,
  details: Record<string, unknown>,
  targetPhone: string | null
) {
  if (targetPhone) {
    return `Phone: ${targetPhone}`;
  }

  const platform = getStringDetail(details, "platform");
  const handle = getStringDetail(details, "handle");

  if (platform && handle) {
    const platformLabel = platform === "instagram" ? "Instagram" : platform === "snapchat" ? "Snapchat" : "Social";
    return `${platformLabel}: @${handle.replace(/^@+/, "")}`;
  }

  if (location === "COLLEGE") {
    return [
      getStringDetail(details, "branch"),
      getStringDetail(details, "section"),
      getStringDetail(details, "yearOfPassing"),
      getStringDetail(details, "collegeName"),
    ].filter(Boolean).join(" · ") || null;
  }

  if (location === "SCHOOL") {
    return [
      getStringDetail(details, "yearOfCompletion"),
      getStringDetail(details, "schoolName"),
    ].filter(Boolean).join(" · ") || null;
  }

  if (location === "WORKPLACE") {
    return [
      getStringDetail(details, "companyName"),
      getStringDetail(details, "city"),
    ].filter(Boolean).join(" · ") || null;
  }

  if (location === "GYM") {
    return [
      getStringDetail(details, "gymName"),
      getStringDetail(details, "pinCode"),
      getStringDetail(details, "timing"),
    ].filter(Boolean).join(" · ") || null;
  }

  if (location === "NEIGHBOURHOOD") {
    return [
      getStringDetail(details, "homeNumber"),
      getStringDetail(details, "premisesName"),
      getStringDetail(details, "city"),
      getStringDetail(details, "state"),
      getStringDetail(details, "pinCode"),
    ].filter(Boolean).join(" · ") || null;
  }

  return null;
}

function buildLocationContext(
  location: string,
  profile:
    | {
        college?: { collegeName: string; branch: string; section: string; yearOfPassing: number } | null;
        school?: { schoolName: string; yearOfCompletion: number } | null;
        workplace?: { companyName: string; city: string } | null;
        gym?: { gymName: string; pinCode: string; timing: string } | null;
        neighbourhood?: { premisesName: string; city: string; state: string; pinCode: string; homeNumber: string } | null;
      }
    | null
) {
  if (!profile) return null;

  if (location === "COLLEGE" && profile.college) {
    return [
      profile.college.branch,
      profile.college.section,
      String(profile.college.yearOfPassing),
      profile.college.collegeName,
    ].filter(Boolean).join(" · ");
  }

  if (location === "SCHOOL" && profile.school) {
    return [
      String(profile.school.yearOfCompletion),
      profile.school.schoolName,
    ].filter(Boolean).join(" · ");
  }

  if (location === "WORKPLACE" && profile.workplace) {
    return [
      profile.workplace.companyName,
      profile.workplace.city,
    ].filter(Boolean).join(" · ");
  }

  if (location === "GYM" && profile.gym) {
    return [
      profile.gym.gymName,
      profile.gym.pinCode,
      profile.gym.timing,
    ].filter(Boolean).join(" · ");
  }

  if (location === "NEIGHBOURHOOD" && profile.neighbourhood) {
    return [
      profile.neighbourhood.homeNumber,
      profile.neighbourhood.premisesName,
      profile.neighbourhood.city,
      profile.neighbourhood.state,
      profile.neighbourhood.pinCode,
    ].filter(Boolean).join(" · ");
  }

  return null;
}

export default async function ConfessionsPage() {
  const user = await getSession();
  if (!user) return null;

  const [viewer, receivedConfessions, sentConfessions, sendPayments, selfConfessionPayments] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      include: {
        college: true,
        school: true,
        workplace: true,
        gym: true,
        neighbourhood: true,
      },
    }),
    prisma.confession.findMany({
      where: { targetId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        unlockedBy: { where: { userId: user.id }, select: { id: true } },
        sender: {
          select: {
            id: true,
            name: true,
            gender: true,
            college: { select: { collegeName: true, branch: true, section: true, yearOfPassing: true } },
            school: { select: { schoolName: true, yearOfCompletion: true } },
            workplace: { select: { companyName: true, city: true } },
            gym: { select: { gymName: true, pinCode: true, timing: true } },
            neighbourhood: { select: { premisesName: true, city: true, state: true, pinCode: true, homeNumber: true } },
          },
        },
      },
    }),
    prisma.confession.findMany({
      where: { senderId: user.id, isSelfConfession: false },
      orderBy: { createdAt: "desc" },
      include: {
        shadowProfile: {
          select: {
            id: true,
            kind: true,
            profileDetails: true,
          },
        },
        target: {
          select: {
            id: true,
            name: true,
            gender: true,
            college: { select: { collegeName: true, branch: true, section: true, yearOfPassing: true } },
            school: { select: { schoolName: true, yearOfCompletion: true } },
            workplace: { select: { companyName: true, city: true } },
            gym: { select: { gymName: true, pinCode: true, timing: true } },
            neighbourhood: { select: { premisesName: true, city: true, state: true, pinCode: true, homeNumber: true } },
          },
        },
      },
    }),
    prisma.payment.findMany({
      where: {
        userId: user.id,
        type: "SEND_CONFESSION",
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        metadata: true,
      },
    }),
    prisma.payment.findMany({
      where: {
        userId: user.id,
        type: "SELF_CONFESSION",
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        metadata: true,
      },
    }),
  ]);
  let revealPayments: Array<{ metadata: unknown }> = [];
  if (await dbSupportsIdentityRevealPaymentType()) {
    revealPayments = await prisma.payment.findMany({
      where: {
        userId: user.id,
        type: "IDENTITY_REVEAL",
        status: PaymentStatus.SUCCESS,
      },
      orderBy: { createdAt: "desc" },
      select: {
        metadata: true,
      },
    });
  }

  const resolutionCandidatesByConfessionId = new Map<string, Awaited<ReturnType<typeof getSearchResultByIds>>>();
  for (const confession of sentConfessions) {
    const shadowProfile = confession.shadowProfile;
    if (!shadowProfile || confession.targetId) {
      continue;
    }

    if (!["COLLEGE", "SCHOOL", "WORKPLACE", "GYM", "NEIGHBOURHOOD"].includes(shadowProfile.kind)) {
      continue;
    }

    if (isFullDetailShadowProfile(shadowProfile.kind, shadowProfile.profileDetails as Record<string, unknown>)) {
      continue;
    }

    const matchDetails = confession.matchDetails as Record<string, string>;
    const matches = await findMatches(confession.location, matchDetails);
    const uniqueIds = [...new Set(matches.map((match: { id: string }) => match.id))];
    const candidates = await getSearchResultByIds(uniqueIds, user.id, { includeCurrentUser: true });
    resolutionCandidatesByConfessionId.set(confession.id, candidates);
  }

  const latestSendPaymentByConfessionId = new Map<
    string,
    { id: string; status: PaymentStatus }
  >();
  for (const payment of sendPayments) {
    const confessionId = getPaymentConfessionId(payment.metadata);
    if (!confessionId || latestSendPaymentByConfessionId.has(confessionId)) {
      continue;
    }

    latestSendPaymentByConfessionId.set(confessionId, {
      id: payment.id,
      status: payment.status,
    });
  }

  const latestSelfPaymentByConfessionId = new Map<
    string,
    { id: string; status: PaymentStatus }
  >();
  for (const payment of selfConfessionPayments) {
    const confessionId = getPaymentConfessionId(payment.metadata);
    if (!confessionId || latestSelfPaymentByConfessionId.has(confessionId)) {
      continue;
    }

    latestSelfPaymentByConfessionId.set(confessionId, {
      id: payment.id,
      status: payment.status,
    });
  }

  const approvedRevealByConfessionId = new Set<string>();
  for (const payment of revealPayments) {
    const confessionId = getPaymentConfessionId(payment.metadata);
    if (confessionId) {
      approvedRevealByConfessionId.add(confessionId);
    }
  }

  const received = receivedConfessions.map((confession) => {
    const matchDetails = confession.matchDetails as Record<string, unknown>;
    const sharedProfileSnapshot = getStoredSharedProfileSnapshot(matchDetails);

    return {
      id: confession.id,
      direction: "received" as const,
      location: confession.location,
      matchDetails,
      message: confession.message,
      status: confession.status,
      reply: confession.reply,
      repliedAt: confession.repliedAt?.toISOString() ?? null,
      createdAt: confession.createdAt.toISOString(),
      mutualDetected: confession.mutualDetected,
      senderRevealConsent: confession.senderRevealConsent,
      targetRevealConsent: confession.revealedAt
        ? true
        : confession.targetRevealConsent && approvedRevealByConfessionId.has(confession.id),
      revealedAt: confession.revealedAt?.toISOString() ?? null,
      isUnlocked: confession.unlockedBy.length > 0,
      counterpartAnonymousId: confession.isSelfConfession
        ? buildTrashAnonymousId(confession.id)
        : buildAnonymousId(confession.sender.id),
      counterpartName: confession.revealedAt ? confession.sender.name : null,
      counterpartGender: confession.selfGenderOverride ?? confession.sender.gender,
      counterpartContext:
        confession.revealedAt && sharedProfileSnapshot
          ? formatSharedProfileDetails(sharedProfileSnapshot.details)
          : null,
    };
  });

  const sent = dedupeSentConfessions(sentConfessions).map((confession) => {
    const matchDetails = confession.matchDetails as Record<string, unknown>;
    const fallbackRecipientName = buildEnteredRecipientName(matchDetails);
    const latestSendPayment = latestSendPaymentByConfessionId.get(confession.id);
    const latestSelfPayment = latestSelfPaymentByConfessionId.get(confession.id);
    const selfClaimSnapshot = viewer ? buildSelfClaimSnapshot(viewer) : null;
    const requiresSelfConfessionPayment = Boolean(
      selfClaimSnapshot &&
      confession.status === "PENDING" &&
      confession.billingState === "FREE" &&
      !confession.targetId &&
      confessionMatchesSelfClaim(confession, selfClaimSnapshot)
    );

    return {
      id: confession.id,
      direction: "sent" as const,
      location: confession.location,
      matchDetails,
      message: confession.message,
      status: confession.status,
      reply: confession.reply,
      repliedAt: confession.repliedAt?.toISOString() ?? null,
      createdAt: confession.createdAt.toISOString(),
      mutualDetected: confession.mutualDetected,
      senderRevealConsent: confession.senderRevealConsent,
      targetRevealConsent: confession.targetRevealConsent,
      revealedAt: confession.revealedAt?.toISOString() ?? null,
      isUnlocked: true,
      counterpartAnonymousId: confession.targetId ? buildAnonymousId(confession.targetId) : buildAnonymousId(confession.id),
      counterpartName: confession.target?.name ?? fallbackRecipientName,
      counterpartGender: confession.target?.gender ?? null,
      billingState: confession.billingState,
      paymentVerificationStatus: latestSendPayment?.status ?? null,
      canRetryPayment: latestSendPayment?.status === PaymentStatus.FAILED,
      selfConfessionPaymentStatus: latestSelfPayment?.status ?? null,
      requiresSelfConfessionPayment,
      resolutionCandidates: (resolutionCandidatesByConfessionId.get(confession.id) ?? []).map((candidate) => {
        const matchingSection =
          candidate.profileSections.find((section) => section.key === confession.location) ??
          candidate.profileSections[0] ??
          null;

        return {
          id: candidate.id,
          name: candidate.name,
          summary: matchingSection ? getConciseCategorySummary(matchingSection) : "",
        };
      }),
      counterpartContext:
        buildLocationContext(confession.location, confession.target) ??
        buildEnteredRecipientContext(confession.location, matchDetails, confession.targetPhone),
    };
  });

  return (
    <ConfessionsInbox
      receivedConfessions={received}
      sentConfessions={sent}
      pageUnlocked={user.confessionPageUnlocked}
    />
  );
}
