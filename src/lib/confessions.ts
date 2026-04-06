export function normalizeComparableFullName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function normalizeComparableHandle(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^@+/, "");
}
