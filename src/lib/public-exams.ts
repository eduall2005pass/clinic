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

export type ExamStatus =
  | "Upcoming"
  | "Live"
  | "Available"
  | "Completed"
  | "Expired"
  | "Inactive"
  | "Unpublished";

export type CourseType = "Academic" | "Admission";

export type PublicExam = {
  id: string;
  /** Owning Public Exam Control category (course_categories.id). */
  categoryId?: string | null;
  name: string;
  /** Public description (admin-managed) shown on the details page. */
  description?: string | null;
  /** Public banner image (admin-managed) shown on the details page. */
  bannerUrl?: string | null;
  batch: string;
  courseType: CourseType;
  subject: string;
  totalMarks: number;
  totalQuestions: number;
  durationMinutes: number;
  /** Negative marks per wrong answer (0 = no negative marking). */
  negativeMarks: number;
  /** Per-exam negative marking toggle (admin-controlled). */
  negativeEnabled: boolean;
  /** Per-exam negative marks per wrong answer. */
  negativePerWrong: number;
  /** Scheduled start time (ISO string). */
  scheduledAt: string | null;
  /** Scheduled end time (ISO string). */
  endsAt: string | null;
  examDate: string;
  examTime: string;
  status: ExamStatus;
  published: boolean;
  /** Second timer enabled for this exam (repeat attempt penalty). */
  secondTimerEnabled: boolean;
  /** Second timer deduction marks. */
  secondTimerDeduction: number;
  eligibility: Eligibility;
};

export const batches: string[] = ["HSC 26", "HSC 27", "HSC 28"];

export const courseTypes: CourseType[] = ["Academic", "Admission"];

export type ExamCategory =
  | "ssc-academic"
  | "hsc-academic"
  | "medical-admission"
  | "varsity-admission";

/** URL key → Course Control category slug (the shared database relationship). */
export const examCategorySlugs: Record<ExamCategory, string> = {
  "ssc-academic": "ssc",
  "hsc-academic": "hsc",
  "medical-admission": "medical",
  "varsity-admission": "varsity",
};

export const examCategories: { key: ExamCategory; label: string }[] = [
  { key: "ssc-academic", label: "SSC Academic Exam" },
  { key: "hsc-academic", label: "HSC Academic Exam" },
  { key: "medical-admission", label: "Medical Admission Exam" },
  { key: "varsity-admission", label: "University Admission Exam" },
];

export const categoryLabels: Record<ExamCategory, string> = {
  "ssc-academic": "SSC Academic Exam",
  "hsc-academic": "HSC Academic Exam",
  "medical-admission": "Medical Admission Exam",
  "varsity-admission": "University Admission Exam",
};

export const categoryDescriptions: Record<ExamCategory, string> = {
  "ssc-academic": "SSC public exam model tests and mock exams for academic students.",
  "hsc-academic": "HSC public exam model tests and mock exams for academic students.",
  "medical-admission": "Medical admission test preparation with model exams and practice tests.",
  "varsity-admission": "University admission test preparation with model exams and practice tests.",
};

/**
 * Display label for a Public Exam category — NEVER contains the word
 * "Course" (Public Exam Control is not Course Control). The four canonical
 * Course Control categories get their fixed exam names; any custom category
 * gets a generic "… Exam" label. Both the Admin Panel and the Main Website
 * use this so names always match while IDs stay the shared relationship.
 */
export function examCategoryLabel(category: {
  name: string;
  slug?: string;
}): string {
  const token = `${category.slug ?? ""} ${category.name}`.toLowerCase();
  if (/varsity|universit/.test(token)) return "University Admission Exam";
  if (/^ssc[\s-]|ssc academic/.test(token)) return "SSC Academic Exam";
  if (/^hsc[\s-]|hsc academic/.test(token)) return "HSC Academic Exam";
  if (/medical/.test(token)) return "Medical Admission Exam";
  let label = category.name.replace(/\bcourses?\b/gi, "Exam").trim();
  if (!/exam/i.test(label)) label = `${label} Exam`;
  return label;
}

/**
 * Display-only grouping used by the Public Exam page layout.
 * Purely structural — no eligibility or participation logic here.
 * Uses subject field to differentiate between medical and varsity admission.
 */
export function categorizeExam(
  exam: Pick<PublicExam, "batch" | "courseType" | "subject">,
): ExamCategory {
  if (exam.courseType === "Academic") {
    return /^SSC/i.test(exam.batch.trim()) ? "ssc-academic" : "hsc-academic";
  }
  // Admission exams: use subject to determine medical vs varsity
  const subject = exam.subject.toLowerCase();
  if (
    subject.includes("medical") ||
    subject.includes("mbbs") ||
    subject.includes("dental") ||
    subject.includes("nursing") ||
    subject.includes("biology") ||
    subject.includes("physics") ||
    subject.includes("chemistry")
  ) {
    return "medical-admission";
  }
  return "varsity-admission";
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
  if (exam.status === "draft") return "Unpublished";
  if (exam.status === "closed") return "Completed";
  const now = Date.now();
  const startsAt = exam.scheduledAt
    ? new Date(exam.scheduledAt).getTime()
    : null;
  const endsAt = exam.endsAt ? new Date(exam.endsAt).getTime() : null;
  // Before the scheduled start time → Upcoming.
  if (startsAt !== null && !Number.isNaN(startsAt) && startsAt > now) {
    return "Upcoming";
  }
  // Past the end time (when set) → Expired.
  if (endsAt !== null && !Number.isNaN(endsAt) && endsAt < now) {
    return "Expired";
  }
  // Within the window or no window set → Live (students can start).
  return "Live";
}