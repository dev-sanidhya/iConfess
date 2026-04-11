import { Prisma, PrismaClient } from "@prisma/client";
import { locationFields, type LocationCategory } from "@/lib/matching";

type DbClient = PrismaClient | Prisma.TransactionClient;

export function getMissingRequiredProfileFields(
  category: LocationCategory,
  profileDetails: Record<string, string> | undefined
) {
  const details = profileDetails ?? {};

  return locationFields[category]
    .filter((field) => field.required)
    .filter((field) => !details[field.key]?.trim())
    .map((field) => field.label);
}

export function validateSelectedProfiles(
  selectedCategories: LocationCategory[],
  profileDetailsByCategory: Partial<Record<LocationCategory, Record<string, string>>>
) {
  for (const category of selectedCategories) {
    const missingFields = getMissingRequiredProfileFields(category, profileDetailsByCategory[category]);
    if (missingFields.length > 0) {
      return {
        category,
        missingFields,
      };
    }
  }

  return null;
}

export async function syncUserProfiles(
  tx: DbClient,
  userId: string,
  fullName: string,
  selectedCategories: LocationCategory[],
  profileDetailsByCategory: Partial<Record<LocationCategory, Record<string, string>>>
) {
  const selected = new Set(selectedCategories);

  if (selected.has("COLLEGE")) {
    const profile = profileDetailsByCategory.COLLEGE ?? {};
    await tx.collegeProfile.upsert({
      where: { userId },
      update: {
        collegeName: profile.collegeName,
        pinCode: profile.pinCode,
        course: profile.course,
        branch: profile.branch,
        yearOfPassing: parseInt(profile.yearOfPassing),
        section: profile.section,
        fullName,
      },
      create: {
        userId,
        collegeName: profile.collegeName,
        pinCode: profile.pinCode,
        course: profile.course,
        branch: profile.branch,
        yearOfPassing: parseInt(profile.yearOfPassing),
        section: profile.section,
        fullName,
      },
    });
  } else {
    await tx.collegeProfile.deleteMany({ where: { userId } });
  }

  if (selected.has("SCHOOL")) {
    const profile = profileDetailsByCategory.SCHOOL ?? {};
    await tx.schoolProfile.upsert({
      where: { userId },
      update: {
        schoolName: profile.schoolName,
        pinCode: profile.pinCode,
        board: profile.board,
        yearOfCompletion: parseInt(profile.yearOfCompletion),
        section: profile.section,
        fullName,
      },
      create: {
        userId,
        schoolName: profile.schoolName,
        pinCode: profile.pinCode,
        board: profile.board,
        yearOfCompletion: parseInt(profile.yearOfCompletion),
        section: profile.section,
        fullName,
      },
    });
  } else {
    await tx.schoolProfile.deleteMany({ where: { userId } });
  }

  if (selected.has("WORKPLACE")) {
    const profile = profileDetailsByCategory.WORKPLACE ?? {};
    await tx.workplaceProfile.upsert({
      where: { userId },
      update: {
        companyName: profile.companyName,
        department: profile.department,
        city: profile.city,
        buildingName: profile.buildingName ?? "",
        fullName,
      },
      create: {
        userId,
        companyName: profile.companyName,
        department: profile.department,
        city: profile.city,
        buildingName: profile.buildingName ?? "",
        fullName,
      },
    });
  } else {
    await tx.workplaceProfile.deleteMany({ where: { userId } });
  }

  if (selected.has("GYM")) {
    const profile = profileDetailsByCategory.GYM ?? {};
    await tx.gymProfile.upsert({
      where: { userId },
      update: {
        gymName: profile.gymName,
        city: profile.city,
        pinCode: profile.pinCode,
        timing: profile.timing as "MORNING" | "EVENING" | "BOTH",
        fullName,
      },
      create: {
        userId,
        gymName: profile.gymName,
        city: profile.city,
        pinCode: profile.pinCode,
        timing: profile.timing as "MORNING" | "EVENING" | "BOTH",
        fullName,
      },
    });
  } else {
    await tx.gymProfile.deleteMany({ where: { userId } });
  }

  if (selected.has("NEIGHBOURHOOD")) {
    const profile = profileDetailsByCategory.NEIGHBOURHOOD ?? {};
    await tx.neighbourhoodProfile.upsert({
      where: { userId },
      update: {
        state: profile.state,
        city: profile.city,
        pinCode: profile.pinCode,
        homeNumber: profile.homeNumber,
        premisesName: profile.premisesName ?? "",
        fullName,
      },
      create: {
        userId,
        state: profile.state,
        city: profile.city,
        pinCode: profile.pinCode,
        homeNumber: profile.homeNumber,
        premisesName: profile.premisesName ?? "",
        fullName,
      },
    });
  } else {
    await tx.neighbourhoodProfile.deleteMany({ where: { userId } });
  }
}
