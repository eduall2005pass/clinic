import type { Exam } from "@/lib/exams-admin";
import {
  batchLabel,
  deriveStatus,
  formatExamTime,
  type PublicExam,
} from "@/lib/public-exams";
import { negativePerWrongFor } from "@/lib/exam-taking";

/**
 * Map an admin Exam row onto the exact PublicExam shape the main website's
 * Public Exam pages render. Pure + client-safe so the Admin Panel can reuse
 * the SAME components/data as the website (MySQL via /api/admin/exams).
 */
export function examToPublic(exam: Exam): PublicExam {
  const batch = batchLabel(exam.batchId);
  const scheduledIso =
    exam.scheduledAt && !Number.isNaN(new Date(exam.scheduledAt).getTime())
      ? exam.scheduledAt
      : null;
  const endsAtIso =
    exam.endsAt && !Number.isNaN(new Date(exam.endsAt).getTime())
      ? exam.endsAt
      : null;
  return {
    id: exam.id,
    name: exam.title,
    description: exam.description ?? null,
    bannerUrl: exam.bannerUrl ?? null,
    batch,
    courseType: exam.courseType,
    subject: exam.subject,
    totalMarks: exam.totalMarks,
    totalQuestions: Math.max(0, Number(exam.questionCount) || 0),
    durationMinutes: exam.durationMinutes,
    negativeMarks: negativePerWrongFor(exam),
    negativeEnabled: exam.ruleTemplate ? exam.ruleTemplate === "medical" || exam.ruleTemplate === "university" : exam.negativeEnabled,
    negativePerWrong: negativePerWrongFor(exam),
    scheduledAt: scheduledIso,
    endsAt: endsAtIso,
    examDate: scheduledIso ? scheduledIso.slice(0, 10) : "",
    examTime: scheduledIso ? formatExamTime(scheduledIso) : "",
    status: deriveStatus(exam),
    published: exam.status !== "draft",
    secondTimerEnabled: exam.secondTimerEnabled,
    secondTimerDeduction: exam.secondTimerDeduction,
    eligibility: { mode: "all", rules: [] },
  };
}
