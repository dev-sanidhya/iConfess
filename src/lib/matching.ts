import { prisma } from "@/lib/prisma";

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
    { key: "collegeName", label: "College Name" },
    { key: "pinCode", label: "Pin Code" },
    { key: "course", label: "Course (e.g. B.Tech)" },
    { key: "branch", label: "Branch (e.g. CSE)" },
    { key: "yearOfPassing", label: "Year of Passing", type: "number" },
    { key: "section", label: "Section" },
    { key: "fullName", label: "Full Name" },
  ],
  SCHOOL: [
    { key: "schoolName", label: "School Name" },
    { key: "pinCode", label: "Pin Code" },
    { key: "board", label: "Board", options: ["CBSE", "ICSE", "State Board", "IB", "IGCSE"] },
    { key: "yearOfCompletion", label: "Year of Completion", type: "number" },
    { key: "section", label: "Section" },
    { key: "fullName", label: "Full Name" },
  ],
  WORKPLACE: [
    { key: "companyName", label: "Company Name" },
    { key: "department", label: "Department" },
    { key: "city", label: "City" },
    { key: "buildingName", label: "Building / Campus Name" },
    { key: "fullName", label: "Full Name" },
  ],
  GYM: [
    { key: "gymName", label: "Gym Name" },
    { key: "city", label: "City" },
    { key: "pinCode", label: "Pin Code" },
    { key: "timing", label: "Timing", options: ["MORNING", "EVENING", "BOTH"] },
    { key: "fullName", label: "Full Name" },
  ],
  NEIGHBOURHOOD: [
    { key: "state", label: "State" },
    { key: "city", label: "City" },
    { key: "pinCode", label: "Pin Code" },
    { key: "premisesName", label: "Society / Premises Name" },
    { key: "fullName", label: "Full Name" },
  ],
};

export const locationCategories: { id: LocationCategory; label: string; emoji: string }[] = [
  { id: "COLLEGE", label: "College / University", emoji: "🎓" },
  { id: "SCHOOL", label: "School (past)", emoji: "🏫" },
  { id: "WORKPLACE", label: "Workplace / Office", emoji: "🏢" },
  { id: "GYM", label: "Gym", emoji: "💪" },
  { id: "NEIGHBOURHOOD", label: "Neighbourhood", emoji: "🏘️" },
];

export async function findMatches(location: string, details: Record<string, string>) {
  const fullName = details.fullName?.trim();

  if (location === "COLLEGE") {
    const profiles = await prisma.collegeProfile.findMany({
      where: {
        ...(details.collegeName && { collegeName: { contains: details.collegeName } }),
        ...(details.pinCode && { pinCode: details.pinCode }),
        ...(details.course && { course: { contains: details.course } }),
        ...(details.branch && { branch: { contains: details.branch } }),
        ...(details.yearOfPassing && { yearOfPassing: parseInt(details.yearOfPassing) }),
        ...(details.section && { section: { contains: details.section } }),
        ...(fullName && { fullName: { contains: fullName } }),
      },
      include: { user: true },
    });
    return profiles.map((p) => p.user);
  }

  if (location === "SCHOOL") {
    const profiles = await prisma.schoolProfile.findMany({
      where: {
        ...(details.schoolName && { schoolName: { contains: details.schoolName } }),
        ...(details.pinCode && { pinCode: details.pinCode }),
        ...(details.board && { board: details.board }),
        ...(details.yearOfCompletion && { yearOfCompletion: parseInt(details.yearOfCompletion) }),
        ...(details.section && { section: { contains: details.section } }),
        ...(fullName && { fullName: { contains: fullName } }),
      },
      include: { user: true },
    });
    return profiles.map((p) => p.user);
  }

  if (location === "WORKPLACE") {
    const profiles = await prisma.workplaceProfile.findMany({
      where: {
        ...(details.companyName && { companyName: { contains: details.companyName } }),
        ...(details.department && { department: { contains: details.department } }),
        ...(details.city && { city: { contains: details.city } }),
        ...(details.buildingName && { buildingName: { contains: details.buildingName } }),
        ...(fullName && { fullName: { contains: fullName } }),
      },
      include: { user: true },
    });
    return profiles.map((p) => p.user);
  }

  if (location === "GYM") {
    const profiles = await prisma.gymProfile.findMany({
      where: {
        ...(details.gymName && { gymName: { contains: details.gymName } }),
        ...(details.city && { city: { contains: details.city } }),
        ...(details.pinCode && { pinCode: details.pinCode }),
        ...(details.timing && { timing: details.timing as "MORNING" | "EVENING" | "BOTH" }),
        ...(fullName && { fullName: { contains: fullName } }),
      },
      include: { user: true },
    });
    return profiles.map((p) => p.user);
  }

  if (location === "NEIGHBOURHOOD") {
    const profiles = await prisma.neighbourhoodProfile.findMany({
      where: {
        ...(details.state && { state: { contains: details.state } }),
        ...(details.city && { city: { contains: details.city } }),
        ...(details.pinCode && { pinCode: details.pinCode }),
        ...(details.premisesName && { premisesName: { contains: details.premisesName } }),
        ...(fullName && { fullName: { contains: fullName } }),
      },
      include: { user: true },
    });
    return profiles.map((p) => p.user);
  }

  return [];
}

export async function getSearchResultByIds(ids: string[], currentUserId: string) {
  if (ids.length === 0) return [];

  const users = await prisma.user.findMany({
    where: {
      id: { in: ids, not: currentUserId },
    },
    include: {
      college: { select: { collegeName: true, branch: true, yearOfPassing: true } },
      workplace: { select: { companyName: true, city: true } },
      gym: { select: { gymName: true, city: true } },
      neighbourhood: { select: { city: true, premisesName: true } },
      school: { select: { schoolName: true, yearOfCompletion: true } },
      _count: { select: { receivedConfessions: true } },
    },
  });

  const byId = new Map(users.map((user) => [user.id, user]));

  return ids
    .map((id) => byId.get(id))
    .filter((user): user is NonNullable<typeof user> => Boolean(user))
    .map((u) => ({
      id: u.id,
      name: u.name,
      username: u.username,
      instagramHandle: u.instagramHandle,
      snapchatHandle: u.snapchatHandle,
      confessionCount: u._count.receivedConfessions,
      college: u.college
        ? `${u.college.collegeName} · ${u.college.branch} · ${u.college.yearOfPassing}`
        : null,
      school: u.school ? `${u.school.schoolName} · ${u.school.yearOfCompletion}` : null,
      workplace: u.workplace ? `${u.workplace.companyName} · ${u.workplace.city}` : null,
      gym: u.gym ? `${u.gym.gymName} · ${u.gym.city}` : null,
      neighbourhood: u.neighbourhood
        ? `${u.neighbourhood.premisesName} · ${u.neighbourhood.city}`
        : null,
    }));
}

export function buildProfileMatchContext(
  location: LocationCategory,
  details: Record<string, string>,
  result: Awaited<ReturnType<typeof getSearchResultByIds>>[number]
) {
  const entries: string[] = [];

  if (location === "COLLEGE") {
    if (details.collegeName && result.college) entries.push(result.college.split(" · ")[0]);
    if (details.branch && result.college) entries.push(result.college.split(" · ")[1] ?? "");
    if (details.yearOfPassing && result.college) entries.push(result.college.split(" · ")[2] ?? "");
  }

  if (location === "SCHOOL" && result.school) {
    if (details.schoolName) entries.push(result.school.split(" · ")[0]);
    if (details.yearOfCompletion) entries.push(result.school.split(" · ")[1] ?? "");
  }

  if (location === "WORKPLACE" && result.workplace) {
    const [company, city] = result.workplace.split(" · ");
    if (details.companyName) entries.push(company);
    if (details.city && city) entries.push(city);
  }

  if (location === "GYM" && result.gym) {
    const [gymName, city] = result.gym.split(" · ");
    if (details.gymName) entries.push(gymName);
    if (details.city && city) entries.push(city);
  }

  if (location === "NEIGHBOURHOOD" && result.neighbourhood) {
    const [premisesName, city] = result.neighbourhood.split(" · ");
    if (details.premisesName) entries.push(premisesName);
    if (details.city && city) entries.push(city);
  }

  if (details.fullName) entries.push(result.name);
  if (details.pinCode) entries.push(`PIN ${details.pinCode}`);
  if (details.course) entries.push(details.course);
  if (details.section) entries.push(details.section);
  if (details.department) entries.push(details.department);
  if (details.buildingName) entries.push(details.buildingName);
  if (details.state) entries.push(details.state);
  if (details.board) entries.push(details.board);
  if (details.timing) entries.push(details.timing);

  return entries.filter(Boolean);
}
