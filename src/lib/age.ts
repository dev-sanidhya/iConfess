const AGE_BUCKETS = [
  { key: "13-17", min: 13, max: 17 },
  { key: "18-21", min: 18, max: 21 },
  { key: "22-25", min: 22, max: 25 },
  { key: "26-30", min: 26, max: 30 },
  { key: "31+", min: 31, max: Number.POSITIVE_INFINITY },
] as const;

export type AgeBucketKey = (typeof AGE_BUCKETS)[number]["key"];

export function calculateAge(dateOfBirth: Date, now = new Date()) {
  let age = now.getFullYear() - dateOfBirth.getFullYear();
  const monthDifference = now.getMonth() - dateOfBirth.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && now.getDate() < dateOfBirth.getDate())
  ) {
    age -= 1;
  }

  return age;
}

export function getAgeBucket(age: number): AgeBucketKey | null {
  const bucket = AGE_BUCKETS.find((item) => age >= item.min && age <= item.max);
  return bucket?.key ?? null;
}

export function getAgeBucketOptions() {
  return AGE_BUCKETS.map((bucket) => bucket.key);
}

export function matchesAgeFilters(
  dateOfBirth: Date | null,
  ageBucket?: string | null,
  specificAge?: number | null
) {
  if (!dateOfBirth) {
    return !ageBucket && typeof specificAge !== "number";
  }

  const age = calculateAge(dateOfBirth);

  if (typeof specificAge === "number" && age !== specificAge) {
    return false;
  }

  if (ageBucket) {
    return getAgeBucket(age) === ageBucket;
  }

  return true;
}

export function parseDateOfBirth(input: unknown) {
  if (typeof input !== "string" || !input.trim()) {
    return null;
  }

  const parsed = new Date(`${input}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}
