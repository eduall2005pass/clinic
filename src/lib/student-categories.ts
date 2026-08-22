// MediSpark student levels (categories) + batch helpers shared by
// registration, profile view and the profile API.
// Stored in students.student_level.

export const STUDENT_LEVELS = [
  "SSC Academic",
  "HSC Academic",
  "Medical Admission",
  "Varsity Admission",
] as const;

export type StudentLevel = (typeof STUDENT_LEVELS)[number];

export function isStudentLevel(value: unknown): value is StudentLevel {
  return (STUDENT_LEVELS as readonly string[]).includes(value as string);
}

/** Legacy rows may have no level yet — infer from the old HSC Batch. */
export function resolveStudentLevel(
  studentLevel: string | null | undefined,
  legacyBatch?: string,
): string {
  if (isStudentLevel(studentLevel)) return studentLevel;
  const batch = (legacyBatch ?? "").toLowerCase();
  if (batch.startsWith("ssc")) return "SSC Academic";
  if (batch.startsWith("varsity")) return "Varsity Admission";
  return "HSC Academic";
}

/** "Academic Batch" vs "Admission Batch" depending on the level. */
export function batchLabelFor(level: string): string {
  return isStudentLevel(level) && level.endsWith("Academic")
    ? "Academic Batch"
    : "Admission Batch";
}

/** Batch years offered at registration (current year −6 … +2). */
export function batchYearOptions(): string[] {
  const currentYear = new Date().getFullYear();
  const years: string[] = [];
  for (let year = currentYear - 6; year <= currentYear + 2; year++) {
    years.push(String(year));
  }
  return years;
}
