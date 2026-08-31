import {
  fetchExams,
  fetchPublishedPublicExams,
  type Exam,
} from "@/lib/exams-admin";
import { fetchActiveCourseCategories } from "@/lib/course-categories-store";
import type { Eligibility } from "@/lib/eligibility";
import {
  batchLabel,
  categorizeExam,
  deriveStatus,
  examCategories,
  examCategorySlugs,
  formatExamTime,
  negativeMarksFor,
  type ExamCategory,
  type PublicExam,
} from "@/lib/public-exams";

function toPublicExam(exam: Exam): PublicExam {
  const batch = batchLabel(exam.batchId);
  const scheduledIso =
    exam.scheduledAt && !Number.isNaN(new Date(exam.scheduledAt).getTime())
      ? exam.scheduledAt
      : null;
  const endsAtIso =
    exam.endsAt && !Number.isNaN(new Date(exam.endsAt).getTime())
      ? exam.endsAt
      : null;
  const rules: Eligibility["rules"] = [];
  if (batch) rules.push({ target: "hscBatch", batch });
  rules.push({ target: exam.courseType === "Admission" ? "admission" : "academic" });

  return {
    id: exam.id,
    categoryId: exam.categoryId ?? null,
    name: exam.title,
    description: exam.description ?? null,
    bannerUrl: exam.bannerUrl ?? null,
    batch,
    courseType: exam.courseType,
    subject: exam.subject,
    totalMarks: exam.totalMarks,
    totalQuestions: Math.max(0, Number(exam.questionCount) || 0),
    durationMinutes: exam.durationMinutes,
    negativeMarks: negativeMarksFor(exam.courseType),
    negativeEnabled: exam.negativeEnabled,
    negativePerWrong: exam.negativePerWrong,
    scheduledAt: scheduledIso,
    endsAt: endsAtIso,
    examDate: scheduledIso ? scheduledIso.slice(0, 10) : "",
    examTime: scheduledIso ? formatExamTime(scheduledIso) : "",
    status: deriveStatus(exam),
    published: true,
    secondTimerEnabled: exam.secondTimerEnabled,
    secondTimerDeduction: exam.secondTimerDeduction,
    eligibility: { mode: "all", rules },
  };
}

/**
 * Live exam catalog for the public site — reads published/closed exams
 * straight from MySQL so admin-panel edits show up immediately.
 * Enrolled exams are excluded — they are gated by course enrollment.
 * Pass categoryId to get ONLY one Public Exam Control category's exams
 * (SQL-level WHERE category_id = ? — same records as the Admin Panel).
 */
export async function fetchPublicExams(
  options: { categoryId?: string } = {},
): Promise<PublicExam[]> {
  const exams = options.categoryId
    ? await fetchPublishedPublicExams(options.categoryId)
    : await fetchExams().then((all) =>
        all.filter((exam) => exam.status !== "draft" && exam.kind !== "enrolled"),
      );
  return exams.map(toPublicExam);
}

/**
 * Resolve a website category URL key (ssc-academic …) to its real Public
 * Exam Control category id in Course Control. Returns null when Course
 * Control has no matching category.
 */
export async function resolveExamCategoryId(
  key: ExamCategory,
): Promise<string | null> {
  const slug = examCategorySlugs[key];
  if (!slug) return null;
  const categories = await fetchActiveCourseCategories();
  return (
    categories.find(
      (category) =>
        category.slug.toLowerCase() === slug ||
        category.slug.toLowerCase().startsWith(slug),
    )?.id ?? null
  );
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

/**
 * Admin variant — same shape as the public catalog but includes drafts
 * (published=false) so the Admin Panel can manage exams before publishing.
 * Same MySQL data as the main website; nothing is hardcoded.
 */
export async function fetchAdminPublicExams(): Promise<PublicExam[]> {
  const exams = await fetchExams();
  return exams
    .filter((exam) => exam.kind !== "enrolled")
    .map((exam) => ({
      ...toPublicExam(exam),
      published: exam.status !== "draft",
    }));
}

/**
 * Live exam counts per Public Exam category — used by the 4 category cards
 * on /exam and /admin/exams/public. Counts ONLY currently Live exams
 * (published + deriveStatus === "Live") that belong to each category via
 * category_id. Falls back to heuristic categorizeExam for legacy exams that
 * have no category_id. Returns 0 for categories with no live exams.
 */
export async function fetchLiveExamCounts(): Promise<
  Record<ExamCategory, number>
> {
  const counts = {} as Record<ExamCategory, number>;
  for (const category of examCategories) counts[category.key] = 0;

  try {
    const categories = await fetchActiveCourseCategories();
    const idToKey = new Map<string, ExamCategory>();
    for (const item of examCategories) {
      const slug = examCategorySlugs[item.key];
      const match = categories.find(
        (category) =>
          category.slug.toLowerCase() === slug ||
          category.slug.toLowerCase().startsWith(slug),
      );
      if (match) idToKey.set(match.id, item.key);
    }

    const exams = await fetchPublicExams();
    for (const exam of exams) {
      if (exam.status !== "Live") continue;
      // Must be published (fetchPublicExams already filters drafts, but
      // double-check for the admin variant path).
      if (!exam.published) continue;
      let key: ExamCategory | undefined;
      if (exam.categoryId && idToKey.has(exam.categoryId)) {
        key = idToKey.get(exam.categoryId);
      } else if (!exam.categoryId) {
        // Legacy exam without category_id — infer via heuristic.
        try {
          key = categorizeExam(exam);
        } catch {
          key = undefined;
        }
      }
      if (key && counts[key] !== undefined) counts[key] += 1;
    }
  } catch {
    // On DB errors return zero counts — cards still render.
  }
  return counts;
}
