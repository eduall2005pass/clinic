import { fetchExams, type Exam } from "@/lib/exams-admin";
import type { Eligibility } from "@/lib/eligibility";
import {
  batchLabel,
  deriveStatus,
  formatExamTime,
  negativeMarksFor,
  type PublicExam,
} from "@/lib/public-exams";

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
    subject: exam.subject,
    totalMarks: exam.totalMarks,
    // Question count as configured by the admin (0 = unknown/not set yet).
    totalQuestions: Math.max(0, Number(exam.questionCount) || 0),
    durationMinutes: exam.durationMinutes,
    // Same rule the grader applies — rules shown must match grading exactly.
    negativeMarks: negativeMarksFor(exam.courseType),
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
