import { fetchExams, type Exam } from "@/lib/exams-admin";
import type { Eligibility } from "@/lib/eligibility";

export type ExamStatus = "Upcoming" | "Live" | "Closed";

export type CourseType = "Academic" | "Admission";

export type PublicExam = {
  id: string;
  name: string;
  batch: string;
  courseType: CourseType;
  totalMarks: number;
  durationMinutes: number;
  examDate: string;
  examTime: string;
  status: ExamStatus;
  published: boolean;
  eligibility: Eligibility;
};

export const batches: string[] = ["HSC 26", "HSC 27", "HSC 28"];

export const courseTypes: CourseType[] = ["Academic", "Admission"];

function batchLabel(batchId: string): string {
  const match = /^hsc-(\d{2})$/i.exec(batchId.trim());
  return match ? `HSC ${match[1]}` : batchId.trim();
}

function formatExamTime(iso: string): string {
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

function toPublicExam(exam: Exam): PublicExam {
  const batch = batchLabel(exam.batchId);
  const scheduledIso =
    exam.scheduledAt && !Number.isNaN(new Date(exam.scheduledAt).getTime())
      ? exam.scheduledAt
      : null;
  const rules: Eligibility["rules"] = [];
  if (batch) rules.push({ target: "hscBatch", batch });
  rules.push({ target: exam.courseType === "Admission" ? "admission" : "academic" });

  return {
    id: exam.id,
    name: exam.title,
    batch,
    courseType: exam.courseType,
    totalMarks: exam.totalMarks,
    durationMinutes: exam.durationMinutes,
    examDate: scheduledIso ? scheduledIso.slice(0, 10) : "",
    examTime: scheduledIso ? formatExamTime(scheduledIso) : "",
    status: deriveStatus(exam),
    published: true,
    eligibility: { mode: "all", rules },
  };
}

/**
 * Live exam catalog for the public site — reads published/closed exams
 * straight from MySQL so admin-panel edits show up immediately.
 * Enrolled exams are excluded — they are gated by course enrollment.
 */
export async function fetchPublicExams(): Promise<PublicExam[]> {
  const exams = await fetchExams();
  return exams
    .filter((exam) => exam.status !== "draft" && exam.kind !== "enrolled")
    .map(toPublicExam);
}

export async function fetchPublicExamById(
  id: string,
): Promise<PublicExam | null> {
  const exams = await fetchPublicExams();
  return exams.find((exam) => exam.id === id) ?? null;
}

/**
 * Exam detail page loader — includes enrolled-kind exams so their /exam/[id]
 * page renders. Actual access (course enrollment) is enforced server-side by
 * /api/exams/[id] when the student tries to participate.
 */
export async function fetchExamPageById(
  id: string,
): Promise<PublicExam | null> {
  const exams = await fetchExams();
  const found = exams.find(
    (exam) => exam.id === id && exam.status !== "draft",
  );
  return found ? toPublicExam(found) : null;
}
