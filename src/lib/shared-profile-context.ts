import type { LocationCategory } from "@/lib/matching";

type SharedProfileDetail = {
  label: string;
  value: string;
};

export type SharedProfileOption = {
  category: LocationCategory;
  label: string;
  summary: string;
  details: SharedProfileDetail[];
};

type SessionUserProfile = {
  college: {
    collegeName: string;
    course: string;
    branch: string;
    yearOfPassing: number;
  } | null;
  school: {
    schoolName: string;
    board: string;
    yearOfCompletion: number;
  } | null;
  workplace: {
    companyName: string;
    department: string;
    city: string;
    buildingName: string;
  } | null;
  gym: {
    gymName: string;
    city: string;
    timing: string;
  } | null;
  neighbourhood: {
    premisesName: string;
    city: string;
    homeNumber: string;
  } | null;
};

export function buildSharedProfileOptions(user: SessionUserProfile): SharedProfileOption[] {
  const options: SharedProfileOption[] = [];

  if (user.college) {
    options.push({
      category: "COLLEGE",
      label: "College / University",
      summary: [user.college.collegeName, user.college.course, user.college.branch, String(user.college.yearOfPassing)].join(" · "),
      details: [
        { label: "College", value: user.college.collegeName },
        { label: "Course", value: user.college.course },
        { label: "Branch", value: user.college.branch },
        { label: "Year", value: String(user.college.yearOfPassing) },
      ],
    });
  }

  if (user.school) {
    options.push({
      category: "SCHOOL",
      label: "School",
      summary: [user.school.schoolName, user.school.board, String(user.school.yearOfCompletion)].join(" · "),
      details: [
        { label: "School", value: user.school.schoolName },
        { label: "Board", value: user.school.board },
        { label: "Year", value: String(user.school.yearOfCompletion) },
      ],
    });
  }

  if (user.workplace) {
    options.push({
      category: "WORKPLACE",
      label: "Workplace / Office",
      summary: [user.workplace.companyName, user.workplace.department, user.workplace.city].join(" · "),
      details: [
        { label: "Company", value: user.workplace.companyName },
        { label: "Department", value: user.workplace.department },
        { label: "City", value: user.workplace.city },
      ],
    });
  }

  if (user.gym) {
    options.push({
      category: "GYM",
      label: "Gym",
      summary: [user.gym.gymName, user.gym.city, user.gym.timing].join(" · "),
      details: [
        { label: "Gym", value: user.gym.gymName },
        { label: "City", value: user.gym.city },
        { label: "Timing", value: user.gym.timing },
      ],
    });
  }

  if (user.neighbourhood) {
    options.push({
      category: "NEIGHBOURHOOD",
      label: "Neighbourhood",
      summary: [user.neighbourhood.premisesName, user.neighbourhood.city, user.neighbourhood.homeNumber].join(" · "),
      details: [
        { label: "Premises", value: user.neighbourhood.premisesName },
        { label: "City", value: user.neighbourhood.city },
        { label: "Home Number", value: user.neighbourhood.homeNumber },
      ],
    });
  }

  return options;
}
