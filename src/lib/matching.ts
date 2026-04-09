import { prisma } from "@/lib/prisma";

export const indianCourseOptions = [
  "B.Tech",
  "B.E.",
  "B.Arch",
  "B.Plan",
  "BCA",
  "B.Sc",
  "B.Sc (Hons)",
  "B.Com",
  "B.Com (Hons)",
  "BA",
  "BA (Hons)",
  "BBA",
  "BMS",
  "B.Des",
  "BFA",
  "B.Pharm",
  "BPT",
  "BHM",
  "B.Ed",
  "LLB",
  "Integrated B.Tech + M.Tech",
  "Integrated MBA",
  "Integrated Law",
  "M.Tech",
  "M.E.",
  "MBA",
  "MCA",
  "M.Sc",
  "M.Com",
  "MA",
  "M.Des",
  "M.Pharm",
  "M.Plan",
  "M.Arch",
  "PhD",
] as const;

export type LocationCategory =
  | "COLLEGE"
  | "SCHOOL"
  | "WORKPLACE"
  | "GYM"
  | "NEIGHBOURHOOD";

export const locationFields: Record<
  LocationCategory,
  { key: string; label: string; type?: string; options?: string[] }[]
> = {
  COLLEGE: [
    { key: "collegeName", label: "College Name (e.g. VIPS)" },
    { key: "pinCode", label: "College Pin Code" },
    { key: "course", label: "Course", options: [...indianCourseOptions] },
    { key: "branch", label: "Branch (e.g. CSE)" },
    { key: "yearOfPassing", label: "Year of Passing  (Graduation Year)", type: "number" },
    { key: "section", label: "Section" },
  ],
  SCHOOL: [
    { key: "schoolName", label: "School Name (e.g. KIS)" },
    { key: "pinCode", label: "School Pin Code" },
    { key: "board", label: "Board", options: ["CBSE", "ICSE", "State Board", "IB", "IGCSE"] },
    { key: "yearOfCompletion", label: "School graduation year (completed or expected)", type: "number" },
    { key: "section", label: "Section" },
  ],
  WORKPLACE: [
    { key: "companyName", label: "Company Name" },
    { key: "department", label: "Department" },
    { key: "city", label: "City" },
  ],
  GYM: [
    { key: "gymName", label: "Gym Name" },
    { key: "city", label: "City" },
    { key: "pinCode", label: "Gym Pin Code" },
    { key: "timing", label: "Timing", options: ["MORNING", "EVENING", "BOTH"] },
  ],
  NEIGHBOURHOOD: [
    { key: "state", label: "State" },
    { key: "city", label: "City" },
    { key: "pinCode", label: "Pin Code" },
    { key: "homeNumber", label: "House Number" },
    { key: "premisesName", label: "Society / Premises Name" },
  ],
};

export const locationCategories: { id: LocationCategory; label: string; emoji: string }[] = [
  { id: "COLLEGE", label: "College / University", emoji: "🎓" },
  { id: "SCHOOL", label: "School", emoji: "🏫" },
  { id: "WORKPLACE", label: "Workplace / Office", emoji: "🏢" },
  { id: "GYM", label: "Gym", emoji: "💪" },
  { id: "NEIGHBOURHOOD", label: "Neighbourhood", emoji: "🏘️" },
];

export type SearchResultProfileSection = {
  key: LocationCategory;
  label: string;
  details: { label: string; value: string }[];
};

export type SearchDetailField = {
  key: string;
  label: string;
  type?: string;
  options?: string[];
  required?: boolean;
};

export const searchDetailFields: Record<LocationCategory, SearchDetailField[]> = {
  COLLEGE: [
    { key: "collegeName", label: "College Name (e.g. VIPS)", required: true },
    { key: "pinCode", label: "College Pin Code" },
    { key: "course", label: "Course", options: locationFields.COLLEGE.find((field) => field.key === "course")?.options ?? [] },
    { key: "yearOfPassing", label: "Year of Passing (Graduation Year)", type: "number" },
    { key: "branch", label: "Branch (e.g. CSE)" },
    { key: "section", label: "Section" },
    { key: "firstName", label: "First Name", required: true },
    { key: "lastName", label: "Last Name" },
  ],
  SCHOOL: [
    { key: "schoolName", label: "School Name (e.g. KIS)", required: true },
    { key: "pinCode", label: "School Pin Code", required: true },
    { key: "board", label: "Board", options: locationFields.SCHOOL.find((field) => field.key === "board")?.options ?? [] },
    { key: "yearOfCompletion", label: "School graduation year (completed or expected)", type: "number" },
    { key: "section", label: "Section" },
    { key: "firstName", label: "First Name", required: true },
    { key: "lastName", label: "Last Name" },
  ],
  WORKPLACE: [
    { key: "companyName", label: "Company Name", required: true },
    { key: "city", label: "City", required: true },
    { key: "department", label: "Department" },
    { key: "firstName", label: "First Name", required: true },
    { key: "lastName", label: "Last Name" },
  ],
  GYM: [
    { key: "gymName", label: "Gym Name", required: true },
    { key: "pinCode", label: "Gym Pin Code", required: true },
    { key: "timing", label: "Timing", options: locationFields.GYM.find((field) => field.key === "timing")?.options ?? [] },
    { key: "firstName", label: "First Name", required: true },
    { key: "lastName", label: "Last Name" },
  ],
  NEIGHBOURHOOD: [
    { key: "state", label: "State", required: true },
    { key: "city", label: "City", required: true },
    { key: "pinCode", label: "Pin Code", required: true },
    { key: "homeNumber", label: "House Number" },
    { key: "premisesName", label: "Society / Premises Name" },
    { key: "firstName", label: "First Name", required: true },
    { key: "lastName", label: "Last Name" },
  ],
};

export function getConciseCategorySummary(section: SearchResultProfileSection) {
  const detailMap = Object.fromEntries(section.details.map((detail) => [detail.label, detail.value]));

  if (section.key === "COLLEGE") {
    return [
      detailMap["Branch"],
      detailMap["Section"],
      detailMap["Year of Passing"],
      detailMap["College Name"],
    ].filter(Boolean).join(" · ");
  }

  if (section.key === "SCHOOL") {
    return [
      detailMap["Year of Completion"],
      detailMap["School Name"],
    ].filter(Boolean).join(" · ");
  }

  if (section.key === "WORKPLACE") {
    return [
      detailMap["Company Name"],
      detailMap["City"],
    ].filter(Boolean).join(" · ");
  }

  if (section.key === "GYM") {
    return [
      detailMap["Gym Name"],
      detailMap["Pin Code"],
      detailMap["Timing"],
    ].filter(Boolean).join(" · ");
  }

  return [
    detailMap["Home Number"],
    detailMap["Society / Premises Name"],
    detailMap["City"],
    detailMap["State"],
    detailMap["Pin Code"],
  ].filter(Boolean).join(" · ");
}

export async function findMatches(location: string, details: Record<string, string>) {
  const fullName = details.fullName?.trim();

  if (location === "COLLEGE") {
    const profiles = await prisma.collegeProfile.findMany({
      where: {
        ...(details.collegeName && { collegeName: { contains: details.collegeName, mode: "insensitive" } }),
        ...(details.pinCode && { pinCode: details.pinCode }),
        ...(details.course && { course: { contains: details.course, mode: "insensitive" } }),
        ...(details.branch && { branch: { contains: details.branch, mode: "insensitive" } }),
        ...(details.yearOfPassing && { yearOfPassing: parseInt(details.yearOfPassing) }),
        ...(details.section && { section: { contains: details.section, mode: "insensitive" } }),
        ...(fullName && { fullName: { contains: fullName, mode: "insensitive" } }),
      },
      include: { user: true },
    });
    return profiles.map((p) => p.user);
  }

  if (location === "SCHOOL") {
    const profiles = await prisma.schoolProfile.findMany({
      where: {
        ...(details.schoolName && { schoolName: { contains: details.schoolName, mode: "insensitive" } }),
        ...(details.pinCode && { pinCode: details.pinCode }),
        ...(details.board && { board: { equals: details.board, mode: "insensitive" } }),
        ...(details.yearOfCompletion && { yearOfCompletion: parseInt(details.yearOfCompletion) }),
        ...(details.section && { section: { contains: details.section, mode: "insensitive" } }),
        ...(fullName && { fullName: { contains: fullName, mode: "insensitive" } }),
      },
      include: { user: true },
    });
    return profiles.map((p) => p.user);
  }

  if (location === "WORKPLACE") {
    const profiles = await prisma.workplaceProfile.findMany({
      where: {
        ...(details.companyName && { companyName: { contains: details.companyName, mode: "insensitive" } }),
        ...(details.department && { department: { contains: details.department, mode: "insensitive" } }),
        ...(details.city && { city: { contains: details.city, mode: "insensitive" } }),
        ...(fullName && { fullName: { contains: fullName, mode: "insensitive" } }),
      },
      include: { user: true },
    });
    return profiles.map((p) => p.user);
  }

  if (location === "GYM") {
    const profiles = await prisma.gymProfile.findMany({
      where: {
        ...(details.gymName && { gymName: { contains: details.gymName, mode: "insensitive" } }),
        ...(details.city && { city: { contains: details.city, mode: "insensitive" } }),
        ...(details.pinCode && { pinCode: details.pinCode }),
        ...(details.timing && { timing: details.timing as "MORNING" | "EVENING" | "BOTH" }),
        ...(fullName && { fullName: { contains: fullName, mode: "insensitive" } }),
      },
      include: { user: true },
    });
    return profiles.map((p) => p.user);
  }

  if (location === "NEIGHBOURHOOD") {
    const profiles = await prisma.neighbourhoodProfile.findMany({
      where: {
        ...(details.state && { state: { contains: details.state, mode: "insensitive" } }),
        ...(details.city && { city: { contains: details.city, mode: "insensitive" } }),
        ...(details.pinCode && { pinCode: details.pinCode }),
        ...(details.homeNumber && { homeNumber: { contains: details.homeNumber, mode: "insensitive" } }),
        ...(details.premisesName && { premisesName: { contains: details.premisesName, mode: "insensitive" } }),
        ...(fullName && { fullName: { contains: fullName, mode: "insensitive" } }),
      },
      include: { user: true },
    });
    return profiles.map((p) => p.user);
  }

  return [];
}

export async function getSearchResultByIds(ids: string[], currentUserId: string, options?: { includeCurrentUser?: boolean }) {
  if (ids.length === 0) return [];

  const users = await prisma.user.findMany({
    where: {
      id: options?.includeCurrentUser
        ? { in: ids }
        : { in: ids, not: currentUserId },
    },
    select: {
      id: true,
      name: true,
      instagramHandle: true,
      snapchatHandle: true,
      college: {
        select: {
          collegeName: true,
          pinCode: true,
          course: true,
          branch: true,
          yearOfPassing: true,
          section: true,
        },
      },
      workplace: {
        select: {
          companyName: true,
          department: true,
          city: true,
        },
      },
      gym: {
        select: {
          gymName: true,
          city: true,
          pinCode: true,
          timing: true,
        },
      },
      neighbourhood: {
        select: {
          state: true,
          city: true,
          pinCode: true,
          premisesName: true,
          homeNumber: true,
        },
      },
      school: {
        select: {
          schoolName: true,
          pinCode: true,
          board: true,
          yearOfCompletion: true,
          section: true,
        },
      },
      primaryCategory: true,
      gender: true,
      confessionPageUnlocked: true,
      receivedConfessions: {
        select: {
          id: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
      profileInsightsOwned: {
        where: { viewerId: currentUserId },
        orderBy: { unlockedAt: "desc" },
        take: 1,
        select: {
          id: true,
          unlockedAt: true,
        },
      },
      _count: { select: { receivedConfessions: true } },
    },
  });

  const byId = new Map(users.map((user) => [user.id, user]));

  return ids
    .map((id) => byId.get(id))
    .filter((user): user is NonNullable<typeof user> => Boolean(user))
    .map((u) => {
      const latestInsightUnlock = u.profileInsightsOwned[0] ?? null;
      const unlockedInsightCount = latestInsightUnlock
        ? u.receivedConfessions.filter((confession) => confession.createdAt <= latestInsightUnlock.unlockedAt).length
        : 0;
      const lockedInsightCount = u.receivedConfessions.length - unlockedInsightCount;

      return {
      id: u.id,
      name: u.name,
      instagramHandle: u.instagramHandle,
      snapchatHandle: u.snapchatHandle,
      primaryCategory: u.primaryCategory,
      gender: u.gender,
      isCurrentUser: u.id === currentUserId,
      confessionPageUnlocked: u.confessionPageUnlocked,
      confessionCount: u._count.receivedConfessions,
      hasUnlockedInsights: unlockedInsightCount > 0,
      unlockedInsightCount,
      lockedInsightCount,
      profileSections: [
        u.college
          ? {
              key: "COLLEGE" as const,
              label: "College / University",
              details: [
                { label: "College Name", value: u.college.collegeName },
                { label: "Pin Code", value: u.college.pinCode },
                { label: "Course", value: u.college.course },
                { label: "Branch", value: u.college.branch },
                { label: "Year of Passing", value: String(u.college.yearOfPassing) },
                { label: "Section", value: u.college.section },
              ],
            }
          : null,
        u.school
          ? {
              key: "SCHOOL" as const,
              label: "School",
              details: [
                { label: "School Name", value: u.school.schoolName },
                { label: "Pin Code", value: u.school.pinCode },
                { label: "Board", value: u.school.board },
                { label: "Year of Completion", value: String(u.school.yearOfCompletion) },
                { label: "Section", value: u.school.section },
              ],
            }
          : null,
        u.workplace
          ? {
              key: "WORKPLACE" as const,
              label: "Workplace / Office",
              details: [
                { label: "Company Name", value: u.workplace.companyName },
                { label: "Department", value: u.workplace.department },
                { label: "City", value: u.workplace.city },
              ],
            }
          : null,
        u.gym
          ? {
              key: "GYM" as const,
              label: "Gym",
              details: [
                { label: "Gym Name", value: u.gym.gymName },
                { label: "City", value: u.gym.city },
                { label: "Pin Code", value: u.gym.pinCode },
                { label: "Timing", value: u.gym.timing },
              ],
            }
          : null,
        u.neighbourhood
          ? {
              key: "NEIGHBOURHOOD" as const,
              label: "Neighbourhood",
              details: [
                { label: "State", value: u.neighbourhood.state },
                { label: "City", value: u.neighbourhood.city },
                { label: "Pin Code", value: u.neighbourhood.pinCode },
                { label: "Home Number", value: u.neighbourhood.homeNumber },
                { label: "Society / Premises Name", value: u.neighbourhood.premisesName },
              ],
            }
          : null,
      ].filter((section): section is SearchResultProfileSection => Boolean(section)),
      college: u.college
        ? `${u.college.branch} · ${u.college.section} · ${u.college.yearOfPassing} · ${u.college.collegeName}`
        : null,
      school: u.school ? `${u.school.yearOfCompletion} · ${u.school.schoolName}` : null,
      workplace: u.workplace ? `${u.workplace.companyName} · ${u.workplace.city}` : null,
      gym: u.gym ? `${u.gym.gymName} · ${u.gym.pinCode} · ${u.gym.timing}` : null,
      neighbourhood: u.neighbourhood
        ? `${u.neighbourhood.homeNumber} · ${u.neighbourhood.premisesName} · ${u.neighbourhood.city} · ${u.neighbourhood.state} · ${u.neighbourhood.pinCode}`
        : null,
      };
    });
}

export function buildProfileMatchContext(
  location: LocationCategory,
  details: Record<string, string>,
  result: Awaited<ReturnType<typeof getSearchResultByIds>>[number]
) {
  const entries: string[] = [];

  if (location === "COLLEGE") {
    const [branch, section, yearOfPassing, collegeName] = result.college?.split(" · ") ?? [];
    if (details.branch && branch) entries.push(branch);
    if (details.section && section) entries.push(section);
    if (details.yearOfPassing && yearOfPassing) entries.push(yearOfPassing);
    if (details.collegeName && collegeName) entries.push(collegeName);
  }

  if (location === "SCHOOL" && result.school) {
    const [yearOfCompletion, schoolName] = result.school.split(" · ");
    if (details.yearOfCompletion && yearOfCompletion) entries.push(yearOfCompletion);
    if (details.schoolName && schoolName) entries.push(schoolName);
  }

  if (location === "WORKPLACE" && result.workplace) {
    const [company, city] = result.workplace.split(" · ");
    if (details.companyName) entries.push(company);
    if (details.city && city) entries.push(city);
  }

  if (location === "GYM" && result.gym) {
    const [gymName, pinCode, timing] = result.gym.split(" · ");
    if (details.gymName && gymName) entries.push(gymName);
    if (details.pinCode && pinCode) entries.push(pinCode);
    if (details.timing && timing) entries.push(timing);
  }

  if (location === "NEIGHBOURHOOD" && result.neighbourhood) {
    const [homeNumber, premisesName, city, state, pinCode] = result.neighbourhood.split(" · ");
    if (details.homeNumber && homeNumber) entries.push(homeNumber);
    if (details.premisesName && premisesName) entries.push(premisesName);
    if (details.city && city) entries.push(city);
    if (details.state && state) entries.push(state);
    if (details.pinCode && pinCode) entries.push(pinCode);
  }

  if (details.fullName) entries.push(result.name);
    if (details.course) entries.push(details.course);
  if (details.department) entries.push(details.department);
  if (details.board) entries.push(details.board);

  return entries.filter(Boolean);
}
