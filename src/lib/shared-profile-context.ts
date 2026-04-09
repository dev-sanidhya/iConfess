import type { LocationCategory } from "@/lib/matching";

export type SharedProfileDetail = {
  label: string;
  value: string;
};

export type SharedProfileOption = {
  category: LocationCategory;
  label: string;
  summary: string;
  details: SharedProfileDetail[];
};

function buildSummary(details: SharedProfileDetail[]) {
  return details.map((detail) => detail.value).filter(Boolean).join(" · ");
}

export function formatSharedProfileDetails(details: SharedProfileDetail[]) {
  return details.map((detail) => `${detail.label}: ${detail.value}`).join(" · ");
}

export function buildSharedProfileOptionsFromUser(user: {
  college?: { branch: string; section: string; yearOfPassing: number; collegeName: string } | null;
  school?: { yearOfCompletion: number; schoolName: string } | null;
  workplace?: { companyName: string; city: string } | null;
  gym?: { gymName: string; pinCode: string; timing: string } | null;
  neighbourhood?: { homeNumber: string; premisesName: string; city: string; state: string; pinCode: string } | null;
}) {
  const options: SharedProfileOption[] = [];

  if (user.college) {
    const details = [
      { label: "Branch", value: user.college.branch },
      { label: "Section", value: user.college.section },
      { label: "Year of Passing", value: String(user.college.yearOfPassing) },
      { label: "College Name", value: user.college.collegeName },
    ];

    options.push({
      category: "COLLEGE",
      label: "College / University",
      summary: buildSummary(details),
      details,
    });
  }

  if (user.school) {
    const details = [
      { label: "School Graduation Year", value: String(user.school.yearOfCompletion) },
      { label: "School Name", value: user.school.schoolName },
    ];

    options.push({
      category: "SCHOOL",
      label: "School",
      summary: buildSummary(details),
      details,
    });
  }

  if (user.workplace) {
    const details = [
      { label: "Company Name", value: user.workplace.companyName },
      { label: "City", value: user.workplace.city },
    ];

    options.push({
      category: "WORKPLACE",
      label: "Workplace / Office",
      summary: buildSummary(details),
      details,
    });
  }

  if (user.gym) {
    const details = [
      { label: "Gym Name", value: user.gym.gymName },
      { label: "Pin Code", value: user.gym.pinCode },
      { label: "Timing", value: user.gym.timing },
    ];

    options.push({
      category: "GYM",
      label: "Gym",
      summary: buildSummary(details),
      details,
    });
  }

  if (user.neighbourhood) {
    const details = [
      { label: "Home Number", value: user.neighbourhood.homeNumber },
      { label: "Society / Premises Name", value: user.neighbourhood.premisesName },
      { label: "City", value: user.neighbourhood.city },
      { label: "State", value: user.neighbourhood.state },
      { label: "Pin Code", value: user.neighbourhood.pinCode },
    ];

    options.push({
      category: "NEIGHBOURHOOD",
      label: "Neighbourhood",
      summary: buildSummary(details),
      details,
    });
  }

  return options;
}

export function buildSharedProfileOptions(user: {
  college?: { branch: string; section: string; yearOfPassing: number; collegeName: string } | null;
  school?: { yearOfCompletion: number; schoolName: string } | null;
  workplace?: { companyName: string; city: string } | null;
  gym?: { gymName: string; pinCode: string; timing: string } | null;
  neighbourhood?: { homeNumber: string; premisesName: string; city: string; state: string; pinCode: string } | null;
}) {
  return buildSharedProfileOptionsFromUser(user);
}

export function getSharedProfileOptionByCategory(
  options: SharedProfileOption[],
  category: string | null | undefined
) {
  if (!category) return null;
  return options.find((option) => option.category === category) ?? null;
}

export function getStoredSharedProfileSnapshot(matchDetails: Record<string, unknown>) {
  const category = typeof matchDetails.sharedProfileCategory === "string" ? matchDetails.sharedProfileCategory : null;
  const label = typeof matchDetails.sharedProfileLabel === "string" ? matchDetails.sharedProfileLabel : null;
  const details = Array.isArray(matchDetails.sharedProfileDetails)
    ? matchDetails.sharedProfileDetails.filter(
        (detail): detail is SharedProfileDetail =>
          typeof detail === "object" &&
          detail !== null &&
          typeof (detail as { label?: unknown }).label === "string" &&
          typeof (detail as { value?: unknown }).value === "string"
      )
    : [];

  if (!category || !label || details.length === 0) {
    return null;
  }

  return {
    category,
    label,
    details,
    summary: buildSummary(details),
  };
}
