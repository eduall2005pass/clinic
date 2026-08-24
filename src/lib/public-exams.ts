import type { Exam } from "@/lib/exams-admin";
import type { Eligibility } from "@/lib/eligibility";

/**
 * MediSpark negative-marking rule — MUST stay identical to
 * `negativeMarksFor()` in src/lib/exam-taking.ts (the grader).
 * Kept inline here so client components never pull in server-only code.
 */
export const NEGATIVE_MARKS_PER_WRONG = 0.25;

export function negativeMarksFor(courseType: string): number {
  return courseType === "Admission" ? NEGATIVE_MARKS_PER_WRONG : 0;
}

export type ExamStatus = "Upcoming" | "Live" | "Closed";

export type CourseType = "Academic" | "Admission";

export type PublicExam = {
  id: string;
  name: string;
  batch: string;
  courseType: CourseType;
  subject: string;
  totalMarks: number;
  totalQuestions: number;
  durationMinutes: number;
  /** Negative marks per wrong answer (0 = no negative marking). */
  negativeMarks: number;
  examDate: string;
  examTime: string;
  status: ExamStatus;
  published: boolean;
  eligibility: Eligibility;
};

export const batches: string[] = ["HSC 26", "HSC 27", "HSC 28"];

export const courseTypes: CourseType[] = ["Academic", "Admission"];

export type ExamCategory =
  | "ssc-academic"
  | "hsc-academic"
  | "medical-admission"
  | "varsity-admission";

export const examCategories: { key: ExamCategory; label: string }[] = [
  { key: "ssc-academic", label: "SSC Academic" },
  { key: "hsc-academic", label: "HSC Academic" },
  { key: "medical-admission", label: "Medical Admission" },
  { key: "varsity-admission", label: "Varsity Admission" },
];

/**
 * Display-only grouping used by the Public Exam page layout.
 * Purely structural — no eligibility or participation logic here.
 */
export function categorizeExam(
  exam: Pick<PublicExam, "batch" | "courseType">,
): ExamCategory {
  if (exam.courseType === "Academic") {
    return /^SSC/i.test(exam.batch.trim()) ? "ssc-academic" : "hsc-academic";
  }
  return "medical-admission";
}

export function batchLabel(batchId: string): string {
  const match = /^hsc-(\d{2})$/i.exec(batchId.trim());
  return match ? `HSC ${match[1]}` : batchId.trim();
}

export function formatExamTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date
    .toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "UTC",
    })
    .toUpperCase();
}

export function deriveStatus(exam: Exam): ExamStatus {
  if (exam.status === "closed") return "Closed";
  const now = Date.now();
  const startsAt = exam.scheduledAt ? new Date(exam.scheduledAt).getTime() : null;
  const endsAt = exam.endsAt ? new Date(exam.endsAt).getTime() : null;
  // Before the start time → Upcoming; after the end time (when set) → Closed.
  if (startsAt !== null && !Number.isNaN(startsAt) && startsAt > now) {
    return "Upcoming";
  }
  if (endsAt !== null && !Number.isNaN(endsAt) && endsAt < now) {
    return "Closed";
  }
  return "Live";
}
