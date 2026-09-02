"use client";

import { useCallback, useEffect, useState } from "react";
import { AccessLoading, AccessMessage } from "@/components/auth/AccessGuard";
import {
  useAdminGate,
  noticeClass,
  cardClass,
  inputClass,
  labelClass,
  buttonPrimaryClass,
  buttonSecondaryClass,
  buttonDangerClass,
  type Notice,
} from "@/components/admin/admin-ui";
import ExamPaperEditor from "@/components/admin/ExamPaperEditor";
import ExamRulesEditor from "@/components/admin/ExamRulesEditor";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MediaUploadField } from "@/components/admin/MediaUploadField";
import { examCategoryLabel } from "@/lib/public-exams";

export type Exam = {
  id: string;
  title: string;
  bannerUrl?: string | null;
  kind: "public" | "practice" | "enrolled";
  batchId: string;
  subject: string;
  courseType: "Academic" | "Admission";
  durationMinutes: number;
  totalMarks: number;
  negativeMarks: number;
  /** Per-exam Admin setting: wrong answers cost negativePerWrong when ON. */
  negativeEnabled?: boolean;
  negativePerWrong?: number;
  /** Per-exam Admin setting: repeat attempt of THIS exam loses marks. */
  secondTimerEnabled?: boolean;
  secondTimerDeduction?: number;
  questionCount: number;
  status: "draft" | "published" | "closed";
  scheduledAt: string | null;
  endsAt: string | null;
  answerKey: Record<string, number> | null;
  courseIds?: string[];
  chapterId?: string | null;
  sortOrder?: number | null;
  /** Public Exam Control category (Course Control id). */
  categoryId?: string | null;
  /** Featured public exams auto-appear in the homepage slider. */
  featured?: boolean;
};

/** When set, the manager is scoped to one Course Control category. */
export type FixedCategory = { id: string; name: string };

/** When set, the manager is scoped to one chapter/subject context. */
export type FixedChapter = { id: string; name: string };

const EMPTY = {
  id: "",
  title: "",
  bannerUrl: "",
  negativeEnabled: false,
  negativePerWrong: "0.25",
  secondTimerEnabled: false,
  secondTimerDeduction: "5",
  kind: "public" as Exam["kind"],
  batchId: "hsc-28",
  subject: "",
  chapterId: "",
  courseType: "Academic" as "Academic" | "Admission",
  durationMinutes: "30",
  negativeMarks: "0.25",
  totalMarks: "",
  status: "draft" as "draft" | "published" | "closed",
  scheduledAt: "",
  endsAt: "",
  ruleTemplate: "academic" as string,
  questionCount: "30",
  marksPerQuestion: "1",
};

function generateExamId(title?: string): string {
  const base =
    title
      ?.toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 20) || "exam";
  const rand = Math.random().toString(36).slice(2, 6);
  const ts = Date.now().toString(36).slice(-4);
  return `${base}-${ts}${rand}`.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 64);
}

function formatExamTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  } catch {
    return "—";
  }
}

function detectTemplateForCategory(cat: FixedCategory | null | undefined): string {
  if (!cat) return "academic";
  const token = `${cat.name}`.toLowerCase();
  if (/medical/.test(token)) return "medical";
  if (/varsity|universit/.test(token)) return "university";
  if (/ssc|hsc|academic/.test(token)) return "academic";
  const label = examCategoryLabel(cat).toLowerCase();
  if (/medical/.test(label)) return "medical";
  if (/university|varsity/.test(label)) return "university";
  return "academic";
}

type CourseOption = { slug: string; name: string };
type ChapterOption = { id: string; name: string };

export default function ExamManager({
  title,
  description,
  kindFilter,
  allowEnrolled = false,
  fixedCategory,
  fixedChapter,
}: {
  title: string;
  description: string;
  /** One kind or several (comma-separated in the API query). */
  kindFilter?: "public" | "practice" | "enrolled" | ("public" | "practice" | "enrolled")[];
  /** Show the "Enrolled" kind + course assignment picker. */
  allowEnrolled?: boolean;
  /** Public Exam Control mode — only this category's public exams. */
  fixedCategory?: FixedCategory;
  /** Course Content Control mode — only this chapter's exams. */
  fixedChapter?: FixedChapter;
}) {
  const gate = useAdminGate();
  const router = useRouter();
  const [exams, setExams] = useState<Exam[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState<FixedCategory[]>([]);
  const [formCategoryId, setFormCategoryId] = useState("");
  const [form, setForm] = useState(EMPTY);
  const [courseIds, setCourseIds] = useState<string[]>([]);
  const [courseOptions, setCourseOptions] = useState<CourseOption[]>([]);
  const [chapterOptions, setChapterOptions] = useState<ChapterOption[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingSortOrder, setEditingSortOrder] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [questionsExam, setQuestionsExam] = useState<Exam | null>(null);

  const load = useCallback(async () => {
    setLoadError(false);
    try {
      const params = new URLSearchParams();
      if (fixedCategory) {
        // Database/API-level isolation — only this category's public exams.
        params.set("kind", "public");
        params.set("categoryId", fixedCategory.id);
        if (fixedChapter) params.set("chapterId", fixedChapter.id);
      } else if (fixedChapter) {
        params.set("chapterId", fixedChapter.id);
        const kinds = Array.isArray(kindFilter) ? kindFilter : kindFilter ? [kindFilter] : [];
        if (kinds.length > 0) params.set("kind", kinds.join(","));
      } else {
        const kinds = Array.isArray(kindFilter) ? kindFilter : kindFilter ? [kindFilter] : [];
        if (kinds.length > 0) params.set("kind", kinds.join(","));
      }
      const query = params.toString();
      const response = await fetch(`/api/admin/exams${query ? `?${query}` : ""}`, {
        cache: "no-store",
        headers: gate.headers,
      });
      if (!response.ok) throw new Error("failed");
      const data = (await response.json()) as { exams?: Exam[] };
      setExams(data.exams ?? []);
    } catch {
      setLoadError(true);
      setExams([]);
    }
  }, [kindFilter, fixedCategory, fixedChapter, gate.headers]);

  useEffect(() => {
    if (gate.ready) void Promise.resolve().then(load);
  }, [gate.ready, load]);

  // Course Control categories — required for public exams created outside a
  // category page so they never end up invisible in Public Exam Control.
  useEffect(() => {
    if (!gate.ready) return;
    let cancelled = false;
    fetch("/api/course-categories", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { categories: [] }))
      .then((data: { categories?: FixedCategory[] }) => {
        if (!cancelled) setCategoryOptions(data.categories ?? []);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [gate.ready]);

  // Course options for the enrolled-exam assignment picker.
  useEffect(() => {
    if (!gate.ready || !allowEnrolled) return;
    fetch("/api/admin/course-subjects", { cache: "no-store", headers: gate.headers })
      .then((response) => response.json())
      .then((data: { courses?: CourseOption[] }) => setCourseOptions(data.courses ?? []))
      .catch(() => setCourseOptions([]));
  }, [gate.ready, allowEnrolled]); // eslint-disable-line react-hooks/exhaustive-deps -- gate.headers is stable

  // Chapter options — exams attach to a chapter for the course-content Exam card.
  useEffect(() => {
    if (!gate.ready) return;
    fetch("/api/admin/chapters", { cache: "no-store", headers: gate.headers })
      .then((response) => response.json())
      .then((data: { chapters?: ChapterOption[] }) => setChapterOptions(data.chapters ?? []))
      .catch(() => setChapterOptions([]));
  }, [gate.ready]); // eslint-disable-line react-hooks/exhaustive-deps -- gate.headers is stable

  if (!gate.ready) {
    return gate.denied ? (
      <AccessMessage title="Administrators only" message="Exam management is restricted to authorized administrators." actionLabel="Back to Admin Home" actionHref="/admin" />
    ) : (
      <AccessLoading label="Loading exams…" />
    );
  }

  function startCreate() {
    if (fixedCategory) {
      const tpl = detectTemplateForCategory(fixedCategory);
      setForm({ ...EMPTY, id: generateExamId(), ruleTemplate: tpl, questionCount: "30", marksPerQuestion: "1" });
    } else {
      setForm(EMPTY);
    }
    setCourseIds([]);
    setFormCategoryId("");
    setEditingId(null);
    setEditingSortOrder(null);
    setShowForm(true);
    setNotice(null);
  }

  function startEdit(exam: Exam) {
    const tpl =
      (exam as unknown as { ruleTemplate?: string | null }).ruleTemplate ??
      detectTemplateForCategory(fixedCategory ?? null);
    const qc = (exam as unknown as { questionCount?: number }).questionCount ?? exam.questionCount ?? 30;
    const mpq = (exam as unknown as { marksPerQuestion?: number | null }).marksPerQuestion ?? 1;
    setForm({
      id: exam.id,
      title: exam.title,
      bannerUrl: exam.bannerUrl ?? "",
      negativeEnabled: exam.negativeEnabled ?? exam.negativeMarks > 0,
      negativePerWrong: String(exam.negativePerWrong ?? 0.25),
      secondTimerEnabled: Boolean(exam.secondTimerEnabled),
      secondTimerDeduction: String(exam.secondTimerDeduction ?? 5),
      kind: exam.kind,
      batchId: exam.batchId || "hsc-28",
      subject: exam.subject,
      chapterId: fixedChapter ? fixedChapter.id : (exam.chapterId ?? ""),
      courseType: exam.courseType,
      durationMinutes: String(exam.durationMinutes),
      negativeMarks: String(exam.negativeMarks),
      totalMarks: exam.totalMarks ? String(exam.totalMarks) : "",
      status: exam.status,
      scheduledAt: exam.scheduledAt ? exam.scheduledAt.slice(0, 16) : "",
      endsAt: exam.endsAt ? exam.endsAt.slice(0, 16) : "",
      ruleTemplate: tpl || "academic",
      questionCount: String(qc || 30),
      marksPerQuestion: String(mpq ?? 1),
    });
    setCourseIds(exam.courseIds ?? []);
    setFormCategoryId(exam.categoryId ?? "");
    setEditingSortOrder(exam.sortOrder ?? null);
    setEditingId(exam.id);
    setShowForm(true);
    setNotice(null);
  }

  async function save() {
    // Public Exam Control has its own validation — skip enrolled kind check when fixedCategory.
    if (!fixedCategory && form.kind === "enrolled" && courseIds.length === 0) {
      setNotice({ kind: "error", text: "Assign at least one course to an enrolled exam." });
      return;
    }
    // Title required in all modes.
    if (!form.title.trim()) {
      setNotice({ kind: "error", text: "Exam Title is required." });
      return;
    }
    // Keep the exam's category stable: fixed inside a category page.
    // In flat lists a public exam MUST have a Course Control category —
    // otherwise it would be invisible in Public Exam Control forever.
    const existing = exams?.find((item) => item.id === editingId);
    const categoryId = fixedCategory
      ? fixedCategory.id
      : form.kind === "public"
        ? formCategoryId || existing?.categoryId || ""
        : existing?.categoryId ?? "";
    if (!fixedCategory && form.kind === "public" && !categoryId) {
      setNotice({ kind: "error", text: "Select a category for this public exam." });
      return;
    }
    // Public Exam Control validation for the new form fields.
    if (fixedCategory) {
      if (!form.subject.trim()) {
        setNotice({ kind: "error", text: "Subject is required." });
        return;
      }
      const qc = Number((form as unknown as Record<string, unknown>).questionCount);
      if (!Number.isFinite(qc) || qc <= 0 || qc > 500) {
        setNotice({ kind: "error", text: "Total Questions must be between 1 and 500." });
        return;
      }
      const mpq = Number((form as unknown as Record<string, unknown>).marksPerQuestion);
      if (!Number.isFinite(mpq) || mpq <= 0) {
        setNotice({ kind: "error", text: "Marks Per Question must be a positive number." });
        return;
      }
    }
    const chapterId = fixedChapter ? fixedChapter.id : form.chapterId;
    // Auto-generate ID for Public Exam Control when missing.
    let examId = form.id.trim().toLowerCase();
    if (fixedCategory && !examId) {
      examId = generateExamId(form.title);
    }
    if (!examId) {
      setNotice({ kind: "error", text: "Exam ID is required." });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      // For Public Exam Control, derive marks from template + auto totals.
      let payload: Record<string, unknown>;
      if (fixedCategory) {
        const qc = Math.floor(Number((form as unknown as Record<string, unknown>).questionCount) || 0);
        const mpqNum = Number((form as unknown as Record<string, unknown>).marksPerQuestion) || 1;
        const total = qc * mpqNum;
        const tpl = (form as unknown as Record<string, unknown>).ruleTemplate as string;
        payload = {
          id: examId,
          title: form.title.trim(),
          kind: "public",
          batchId: form.batchId,
          subject: form.subject.trim(),
          courseType: form.courseType,
          durationMinutes: Number(form.durationMinutes) || 30,
          status: form.status,
          scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null,
          endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
          bannerUrl: form.bannerUrl || null,
          chapterId,
          categoryId,
          courseIds: [],
          ruleTemplate: tpl || detectTemplateForCategory(fixedCategory),
          questionCount: qc,
          marksPerQuestion: mpqNum,
          totalMarks: total,
          // template controls these — still send for legacy columns but server will override via ruleTemplateDefaults
          negativeMarks: 0,
          ...(editingSortOrder !== null ? { sortOrder: editingSortOrder } : {}),
        };
      } else {
        payload = {
          ...form,
          id: examId,
          ...(editingSortOrder !== null ? { sortOrder: editingSortOrder } : {}),
          chapterId,
          courseIds: form.kind === "enrolled" ? courseIds : [],
          categoryId,
          bannerUrl: form.bannerUrl,
          negativeEnabled: form.negativeEnabled,
          negativePerWrong: Number(form.negativePerWrong) || 0.25,
          secondTimerEnabled: form.secondTimerEnabled,
          secondTimerDeduction: Number(form.secondTimerDeduction) || 5,
          negativeMarks: form.negativeEnabled ? Number(form.negativePerWrong) || 0.25 : 0,
          durationMinutes: Number(form.durationMinutes) || 30,
          totalMarks: form.totalMarks ? Number(form.totalMarks) : undefined,
          scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null,
          endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
        };
      }
      const response = await fetch("/api/admin/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...gate.headers },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => null)) as { error?: string; exam?: Exam } | null;
      if (!response.ok) {
        setNotice({ kind: "error", text: data?.error ?? "Failed to save." });
        return;
      }
      const wasNew = !editingId;
      setShowForm(false);
      await load();
      setNotice({ kind: "success", text: `Exam “${data?.exam?.title ?? form.title}” saved.` });
      // After creating an exam, auto-create Q01..QNN slots already handled server-side via ensureQuestionSlots.
      // Open the Questions tab directly so admin sees all generated slots without clicking Add 30 times.
      if (wasNew && data?.exam?.id) {
        router.push(`/admin/exams/${encodeURIComponent(data.exam.id)}/manage?tab=questions`);
      }
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus(exam: Exam) {
    const next =
      exam.status === "published" ? "draft" : "published";
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/exams", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...gate.headers },
        body: JSON.stringify({ id: exam.id, status: next }),
      });
      const data = (await response.json().catch(() => null)) as
        | { error?: string; exams?: Exam[] }
        | null;
      if (!response.ok) {
        setNotice({ kind: "error", text: data?.error ?? "Failed to update." });
        return;
      }
      if (data?.exams) setExams(data.exams);
      setNotice({
        kind: "success",
        text:
          next === "published"
            ? `“${exam.title}” published — visible to students.`
            : `“${exam.title}” unpublished.`,
      });
    } finally {
      setBusy(false);
    }
  }

  // Featured ON/OFF — the homepage slider picks up published featured
  // public exams automatically from the same exam data (single source of
  // truth). Saves through the normal exam upsert with the full payload.
  async function toggleFeatured(exam: Exam) {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...gate.headers },
        body: JSON.stringify({ ...exam, featured: !exam.featured }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setNotice({ kind: "error", text: data?.error ?? "Failed to update." });
        return;
      }
      await load();
      setNotice({
        kind: "success",
        text: !exam.featured
          ? `“${exam.title}” marked Featured — it will appear in the homepage slider once published.`
          : `“${exam.title}” removed from the homepage slider.`,
      });
    } finally {
      setBusy(false);
    }
  }

  async function duplicate(id: string) {
    if (!window.confirm("Duplicate this exam with its questions and rules?")) return;
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/exams/duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...gate.headers },
        body: JSON.stringify({ id }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string; exam?: Exam } | null;
      if (!response.ok) {
        setNotice({ kind: "error", text: data?.error ?? "Failed to duplicate." });
        return;
      }
      await load();
      setNotice({ kind: "success", text: `“${data?.exam?.title ?? id}” duplicated.` });
    } finally {
      setBusy(false);
    }
  }

  async function toggleArchive(exam: Exam) {
    const isArchived = exam.status === "closed";
    if (!window.confirm(isArchived ? `Unarchive “${exam.title}”?` : `Archive “${exam.title}”? Archived exams become closed and hidden from students.`)) return;
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/exams/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...gate.headers },
        body: JSON.stringify({ id: exam.id, archived: !isArchived }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setNotice({ kind: "error", text: data?.error ?? "Failed to update." });
        return;
      }
      await load();
      setNotice({ kind: "success", text: isArchived ? `“${exam.title}” unarchived.` : `“${exam.title}” archived.` });
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string, name: string) {
    if (!window.confirm(`Delete Exam?\n\nThis exam and its associated questions will be permanently removed. This action cannot be undone.\n\nDelete “${name}”?`)) return;
    setBusy(true);
    try {
      const response = await fetch("/api/admin/exams", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...gate.headers },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) {
        setNotice({ kind: "error", text: "Failed to delete." });
        return;
      }
      await load();
      setNotice({ kind: "success", text: `“${name}” deleted.` });
    } finally {
      setBusy(false);
    }
  }

  async function move(index: number, direction: -1 | 1) {
    if (!exams) return;
    const target = index + direction;
    if (target < 0 || target >= exams.length) return;
    const next = [...exams];
    [next[index], next[target]] = [next[target], next[index]];
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/exams", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...gate.headers },
        body: JSON.stringify({ order: next.map((item) => item.id) }),
      });
      if (!response.ok) {
        setNotice({ kind: "error", text: "Failed to reorder." });
        return;
      }
      await load();
      setNotice({ kind: "success", text: "Exam order updated." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-[#0b1e3a] admin-dark:text-white">{title}</h2>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-500 admin-dark:text-slate-400">{description}</p>
        </div>
        <button type="button" onClick={startCreate} className={buttonPrimaryClass}>+ New Exam</button>
      </header>

      {loadError ? (
        <div className={`${cardClass} mt-5 p-8 text-center`}>
          <p className="text-sm font-semibold text-slate-700 admin-dark:text-zinc-200">
            Could not load exams.
          </p>
          <button
            type="button"
            onClick={() => void load()}
            className={`${buttonPrimaryClass} mt-4`}
          >
            Try Again
          </button>
        </div>
      ) : exams === null ? (
        <p className={`${cardClass} mt-5 p-6 text-center text-sm text-slate-500`}>Loading…</p>
      ) : exams.length === 0 ? (
        <p className={`${cardClass} mt-5 p-8 text-center text-sm text-slate-500`}>No exams yet.</p>
      ) : (
        <ul className="mt-5 space-y-3">
          {exams.map((exam, examIndex) => (
            <li key={exam.id} className={`${cardClass} flex flex-col gap-3 p-4 sm:p-5`}>
              {/* Top row: Exam Name + Published badge — same row when width allows, wraps cleanly on mobile */}
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="min-w-0 flex-1 truncate text-base font-bold leading-tight text-[#0b1e3a] admin-dark:text-zinc-100">{exam.title}</h3>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${
                    exam.status === "published"
                      ? "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20 admin-dark:bg-emerald-500/10 admin-dark:text-emerald-400"
                      : exam.status === "closed"
                        ? "bg-red-500/10 text-red-600 ring-1 ring-red-500/20"
                        : "bg-zinc-500/10 text-slate-600 ring-1 ring-zinc-500/20 admin-dark:bg-zinc-500/10 admin-dark:text-slate-400"
                  }`}
                >
                  {exam.status === "published" ? "Published" : exam.status === "draft" ? "Draft" : exam.status}
                </span>
                {exam.featured && (
                  <span
                    title="Featured in the homepage slider"
                    className="shrink-0 rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-amber-700 ring-1 ring-amber-500/20"
                  >
                    ★ Featured
                  </span>
                )}
              </div>
              {/* Second line: ONLY Subject · Mark · Minute · Start · End — clean subtle style */}
              <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs font-medium leading-relaxed text-slate-500 admin-dark:text-slate-400">
                <span className="font-semibold text-slate-600 admin-dark:text-slate-300">{exam.subject || "—"}</span>
                <span className="text-slate-300 admin-dark:text-slate-600">·</span>
                <span>{exam.totalMarks ?? 0} Marks</span>
                <span className="text-slate-300 admin-dark:text-slate-600">·</span>
                <span>{exam.durationMinutes ?? 0} Minutes</span>
                <span className="text-slate-300 admin-dark:text-slate-600">·</span>
                <span>Start: {formatExamTime(exam.scheduledAt)}</span>
                <span className="text-slate-300 admin-dark:text-slate-600">·</span>
                <span>End: {formatExamTime(exam.endsAt)}</span>
              </p>
              {/* Action buttons — dedicated second row at bottom, consistent height/padding/radius */}
              <div className="flex flex-wrap items-center gap-2 border-t border-[#eef4ff] pt-3 admin-dark:border-[#1e3a65]/50">
                <button
                  type="button"
                  onClick={() => setQuestionsExam(exam)}
                  className={`${buttonPrimaryClass} min-w-[88px] shrink-0 px-4 py-2 text-xs`}
                  title="Open Question Management"
                >
                  Questions
                </button>
                <button
                  type="button"
                  onClick={() => startEdit(exam)}
                  className={`${buttonSecondaryClass} min-w-[80px] shrink-0 px-4 py-2 text-xs`}
                  title="Edit exam information"
                >
                  Manage
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void toggleFeatured(exam)}
                  className={`${exam.featured ? buttonPrimaryClass : buttonSecondaryClass} min-w-[88px] shrink-0 px-4 py-2 text-xs`}
                  title={exam.featured ? "Featured — click to unfeature" : "Not featured — click to feature"}
                >
                  {exam.featured ? "Featured" : "Feature"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void toggleStatus(exam)}
                  className={`${buttonSecondaryClass} min-w-[96px] shrink-0 px-4 py-2 text-xs`}
                  title={exam.status === "published" ? "Unpublish exam" : "Publish exam"}
                >
                  {exam.status === "published" ? "Unpublished" : "Publish"}
                </button>
                <button
                  type="button"
                  onClick={() => void remove(exam.id, exam.title)}
                  disabled={busy}
                  aria-label={`Delete ${exam.title}`}
                  className="min-w-[80px] shrink-0 rounded-xl border border-red-200 bg-[#fef2f2] px-4 py-2 text-xs font-bold text-red-600 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 active:bg-red-100 disabled:opacity-50 admin-dark:border-red-900/30 admin-dark:bg-red-500/10 admin-dark:text-red-400 admin-dark:hover:border-red-800/50 admin-dark:hover:bg-red-500/20"
                  title="Delete exam permanently"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Public Exam Category: bottom [+ Add Exam] removed — only top + New Exam remains (spec). Keep bottom button for Course Content Control chapter exams only. */}
      {fixedChapter && !fixedCategory && (
        <div className="mt-5">
          <button type="button" onClick={startCreate} className={`${buttonPrimaryClass} w-full py-3`}>
            + Add Exam
          </button>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true">
          <div className={`${cardClass} max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-b-none p-5 sm:rounded-2xl sm:p-6`}>
            <h3 className="text-lg font-extrabold text-[#0b1e3a] admin-dark:text-zinc-100">
              {editingId ? "Edit Exam" : "New Exam"}
            </h3>
            <form
              className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                void save();
              }}
            >
              {fixedCategory ? (
                <>
                  {/* Public Exam Control — 15-field form exactly as spec */}
                  <div className="sm:col-span-2">
                    <label className={labelClass} htmlFor="ex-title">Exam Title</label>
                    <input id="ex-title" className={inputClass} value={form.title} placeholder="e.g. Medical Admission Model Test 01"
                      onChange={(event) => setForm({ ...form, title: event.target.value })} />
                    <p className="mt-1 text-[11px] text-slate-500">Category: <span className="font-bold">{examCategoryLabel(fixedCategory)}</span> (fixed — auto-assigned)</p>
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="ex-id">Exam ID — auto-generated</label>
                    <input id="ex-id" className={`${inputClass} bg-slate-50`} value={form.id} disabled placeholder="auto-generated" />
                    <p className="mt-1 text-[11px] text-slate-500">{editingId ? "Existing ID (not editable)." : "Auto-generated ID will be used to create question slots Q01..QNN."}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <MediaUploadField
                      id="ex-banner"
                      label="Exam Banner — upload"
                      directory="exams"
                      accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
                      preview
                      value={form.bannerUrl}
                      onChange={(url) => setForm({ ...form, bannerUrl: url })}
                    />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="ex-status">Status</label>
                    <select id="ex-status" className={inputClass} value={form.status}
                      onChange={(event) => setForm({ ...form, status: event.target.value as "draft" | "published" | "closed" })}>
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="ex-batch">Batch</label>
                    <select id="ex-batch" className={inputClass} value={form.batchId}
                      onChange={(event) => setForm({ ...form, batchId: event.target.value })}>
                      <option value="">Any</option>
                      <option value="hsc-28">HSC 28</option>
                      <option value="hsc-27">HSC 27</option>
                      <option value="hsc-26">HSC 26</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="ex-subject">Subject</label>
                    <input id="ex-subject" className={inputClass} value={form.subject} placeholder="e.g. Biology"
                      onChange={(event) => setForm({ ...form, subject: event.target.value })} />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="ex-course-type">Course Type</label>
                    <select id="ex-course-type" className={inputClass} value={form.courseType}
                      onChange={(event) => setForm({ ...form, courseType: event.target.value as "Academic" | "Admission" })}>
                      <option value="Academic">Academic</option>
                      <option value="Admission">Admission</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="ex-chapter">Chapter</label>
                    {fixedChapter ? (
                      <>
                        <input id="ex-chapter" className={inputClass} value={fixedChapter.name} disabled />
                        <p className="mt-1 text-[11px] text-slate-500">Fixed to this chapter — auto-assigned.</p>
                      </>
                    ) : (
                      <select id="ex-chapter" className={inputClass} value={form.chapterId}
                        onChange={(event) => setForm({ ...form, chapterId: event.target.value })}>
                        <option value="">None</option>
                        {chapterOptions.map((chapter) => (
                          <option key={chapter.id} value={chapter.id}>{chapter.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="ex-duration">Duration (minutes)</label>
                    <input id="ex-duration" type="number" min="1" className={inputClass} value={form.durationMinutes}
                      onChange={(event) => setForm({ ...form, durationMinutes: event.target.value })} />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="ex-rules">Rules</label>
                    <select id="ex-rules" className={inputClass} value={(form as unknown as { ruleTemplate: string }).ruleTemplate}
                      onChange={(event) => setForm({ ...form, ruleTemplate: event.target.value } as unknown as typeof form)}>
                      <option value="academic">Academic Rules</option>
                      <option value="medical">Medical Rules</option>
                      <option value="university">University Rules</option>
                    </select>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {(form as unknown as { ruleTemplate: string }).ruleTemplate === "medical" && "Medical: negative marking + second-timer penalty."}
                      {(form as unknown as { ruleTemplate: string }).ruleTemplate === "university" && "University: negative marking, no second-timer."}
                      {(form as unknown as { ruleTemplate: string }).ruleTemplate === "academic" && "Academic: no negative marking, no second-timer."}
                    </p>
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="ex-qcount">Total Questions</label>
                    <input id="ex-qcount" type="number" min="1" max="500" className={inputClass} value={(form as unknown as { questionCount: string }).questionCount}
                      onChange={(event) => setForm({ ...form, questionCount: event.target.value } as unknown as typeof form)} />
                    <p className="mt-1 text-[11px] text-slate-500">Q01..Q{String((form as unknown as { questionCount: string }).questionCount || "0").padStart(2, "0")} slots will be auto-created.</p>
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="ex-mpq">Marks Per Question</label>
                    <input id="ex-mpq" type="number" min="0.5" step="0.5" className={inputClass} value={(form as unknown as { marksPerQuestion: string }).marksPerQuestion}
                      onChange={(event) => setForm({ ...form, marksPerQuestion: event.target.value } as unknown as typeof form)} />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="ex-total">Total Marks — auto calculated</label>
                    <input id="ex-total" className={`${inputClass} bg-slate-50`} value={String((Number((form as unknown as { questionCount: string }).questionCount) || 0) * (Number((form as unknown as { marksPerQuestion: string }).marksPerQuestion) || 0))} disabled />
                    <p className="mt-1 text-[11px] text-slate-500">{(form as unknown as { questionCount: string }).questionCount || 0} × {(form as unknown as { marksPerQuestion: string }).marksPerQuestion || 0} = {String((Number((form as unknown as { questionCount: string }).questionCount) || 0) * (Number((form as unknown as { marksPerQuestion: string }).marksPerQuestion) || 0))} marks</p>
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="ex-schedule">Start Time</label>
                    <input id="ex-schedule" type="datetime-local" className={inputClass} value={form.scheduledAt}
                      onChange={(event) => setForm({ ...form, scheduledAt: event.target.value })} />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="ex-ends">End Time</label>
                    <input id="ex-ends" type="datetime-local" className={inputClass} value={form.endsAt}
                      onChange={(event) => setForm({ ...form, endsAt: event.target.value })} />
                  </div>
                  {/* Rules auto-drive marking — no manual toggles. EditingId still shows ExamRulesEditor for rule text. */}
                  {editingId && (
                    <div className="sm:col-span-2">
                      <ExamRulesEditor examId={editingId} authHeaders={gate.headers} />
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Non-Public-Exam form — keep original fields for Course Content Control */}
                  <div>
                    <label className={labelClass} htmlFor="ex-id">ID (lowercase-dash)</label>
                    <input id="ex-id" className={inputClass} value={form.id} disabled={Boolean(editingId)}
                      onChange={(event) => setForm({ ...form, id: event.target.value.toLowerCase() })} />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="ex-title">Title</label>
                    <input id="ex-title" className={inputClass} value={form.title}
                      onChange={(event) => setForm({ ...form, title: event.target.value })} />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="ex-kind">Kind</label>
                    <select id="ex-kind" className={inputClass} value={form.kind}
                      onChange={(event) => setForm({ ...form, kind: event.target.value as Exam["kind"] })}>
                      <option value="public">Public</option>
                      <option value="practice">Practice</option>
                      {allowEnrolled && <option value="enrolled">Enrolled (course students)</option>}
                    </select>
                  </div>
                  {form.kind === "public" && (
                    <div>
                      <label className={labelClass} htmlFor="ex-category">Category (Course Control)</label>
                      <select
                        id="ex-category"
                        className={inputClass}
                        value={formCategoryId}
                        onChange={(event) => setFormCategoryId(event.target.value)}
                      >
                        <option value="">Select a category…</option>
                        {categoryOptions.map((category) => (
                          <option key={category.id} value={category.id}>
                            {examCategoryLabel(category)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {allowEnrolled && form.kind === "enrolled" && (
                    <div className="sm:col-span-2">
                      <span className={labelClass}>Assign courses (students enrolled in any of these)</span>
                      {courseOptions.length === 0 ? (
                        <p className="mt-1 text-xs text-slate-500">Loading courses…</p>
                      ) : (
                        <div className="mt-2 max-h-44 space-y-1.5 overflow-y-auto rounded-xl border border-neutral-200 p-3 admin-dark:border-zinc-700">
                          {courseOptions.map((course) => (
                            <label key={course.slug} className="flex items-center gap-2 text-sm text-slate-700 admin-dark:text-zinc-200">
                              <input
                                type="checkbox"
                                checked={courseIds.includes(course.slug)}
                                onChange={(event) =>
                                  setCourseIds(
                                    event.target.checked
                                      ? [...courseIds, course.slug]
                                      : courseIds.filter((id) => id !== course.slug),
                                  )
                                }
                              />
                              <span className="truncate">{course.name}</span>
                              <span className="ml-auto shrink-0 text-[10px] font-bold uppercase tracking-wide text-slate-400">{course.slug}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="sm:col-span-2">
                    <MediaUploadField
                      id="ex-banner"
                      label="Exam Banner (shown on the student exam card & rules page)"
                      directory="exams"
                      accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
                      preview
                      value={form.bannerUrl}
                      onChange={(url) => setForm({ ...form, bannerUrl: url })}
                    />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="ex-status">Status</label>
                    <select id="ex-status" className={inputClass} value={form.status}
                      onChange={(event) =>
                        setForm({ ...form, status: event.target.value as "draft" | "published" | "closed" })
                      }>
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="ex-batch">Batch</label>
                    <select id="ex-batch" className={inputClass} value={form.batchId}
                      onChange={(event) => setForm({ ...form, batchId: event.target.value })}>
                      <option value="">Any</option>
                      <option value="hsc-28">HSC 28</option>
                      <option value="hsc-27">HSC 27</option>
                      <option value="hsc-26">HSC 26</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="ex-subject">Subject</label>
                    <input id="ex-subject" className={inputClass} value={form.subject}
                      onChange={(event) => setForm({ ...form, subject: event.target.value })} />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="ex-course-type">Course type</label>
                    <select id="ex-course-type" className={inputClass} value={form.courseType}
                      onChange={(event) =>
                        setForm({ ...form, courseType: event.target.value as "Academic" | "Admission" })
                      }>
                      <option value="Academic">Academic</option>
                      <option value="Admission">Admission</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="ex-chapter">Chapter (course content)</label>
                    {fixedChapter ? (
                      <>
                        <input id="ex-chapter" className={inputClass} value={fixedChapter.name} disabled />
                        <p className="mt-1 text-[11px] text-slate-500">Fixed to this chapter — auto-assigned.</p>
                      </>
                    ) : (
                      <select id="ex-chapter" className={inputClass} value={form.chapterId}
                        onChange={(event) => setForm({ ...form, chapterId: event.target.value })}>
                        <option value="">None</option>
                        {chapterOptions.map((chapter) => (
                          <option key={chapter.id} value={chapter.id}>{chapter.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="ex-duration">Duration (minutes)</label>
                    <input id="ex-duration" type="number" min="1" className={inputClass} value={form.durationMinutes}
                      onChange={(event) => setForm({ ...form, durationMinutes: event.target.value })} />
                  </div>
                  <div className="sm:col-span-2 rounded-xl border border-neutral-200 p-3 admin-dark:border-zinc-700">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-extrabold uppercase tracking-wide text-slate-700 admin-dark:text-zinc-200">
                        Negative Marking
                      </span>
                      <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-zinc-600 admin-dark:text-zinc-300">
                        <input
                          type="checkbox"
                          checked={form.negativeEnabled}
                          onChange={(event) => setForm({ ...form, negativeEnabled: event.target.checked })}
                        />
                        {form.negativeEnabled ? "ON" : "OFF"}
                      </label>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Wrong Answer Penalty: <span className="font-bold">0.25</span> per wrong answer
                      {form.negativeEnabled ? "" : " (no deduction while OFF)"}.
                    </p>
                  </div>
                  <div className="sm:col-span-2 rounded-xl border border-neutral-200 p-3 admin-dark:border-zinc-700">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-extrabold uppercase tracking-wide text-slate-700 admin-dark:text-zinc-200">
                        Second Timer Penalty
                      </span>
                      <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-zinc-600 admin-dark:text-zinc-300">
                        <input
                          type="checkbox"
                          checked={form.secondTimerEnabled}
                          onChange={(event) => setForm({ ...form, secondTimerEnabled: event.target.checked })}
                        />
                        {form.secondTimerEnabled ? "ON" : "OFF"}
                      </label>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                        Second Timer Deduction
                      </span>
                      <input
                        aria-label="Second timer deduction (marks)"
                        type="number"
                        min="0"
                        step="0.5"
                        disabled={!form.secondTimerEnabled}
                        className={`${inputClass} w-28 disabled:opacity-50`}
                        value={form.secondTimerDeduction}
                        onChange={(event) => setForm({ ...form, secondTimerDeduction: event.target.value })}
                      />
                      <span className="text-[11px] text-slate-500">marks (repeat attempt of THIS exam only)</span>
                    </div>
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="ex-marks">Total marks (auto from questions)</label>
                    <input id="ex-marks" type="number" min="0" className={inputClass} value={form.totalMarks}
                      placeholder="Auto" onChange={(event) => setForm({ ...form, totalMarks: event.target.value })} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass} htmlFor="ex-schedule">Start time (optional)</label>
                    <input id="ex-schedule" type="datetime-local" className={inputClass} value={form.scheduledAt}
                      onChange={(event) => setForm({ ...form, scheduledAt: event.target.value })} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass} htmlFor="ex-ends">End time (optional — exam closes after this)</label>
                    <input id="ex-ends" type="datetime-local" className={inputClass} value={form.endsAt}
                      onChange={(event) => setForm({ ...form, endsAt: event.target.value })} />
                  </div>
                  {editingId && (
                    <ExamRulesEditor examId={editingId} authHeaders={gate.headers} />
                  )}
                </>
              )}
              <div className="sm:col-span-2 flex gap-3">
                <button type="submit" disabled={busy} className={buttonPrimaryClass}>{busy ? "Saving…" : "Save Exam"}</button>
                <button type="button" onClick={() => setShowForm(false)} className={buttonSecondaryClass}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {questionsExam && (
        <ExamPaperEditor
          exam={{
            id: questionsExam.id,
            title: questionsExam.title,
            subject: questionsExam.subject,
            totalMarks: questionsExam.totalMarks,
            durationMinutes: questionsExam.durationMinutes,
            questionCount: questionsExam.questionCount,
            status: questionsExam.status,
            ruleTemplate: (questionsExam as unknown as { ruleTemplate?: string | null }).ruleTemplate ?? null,
            marksPerQuestion: (questionsExam as unknown as { marksPerQuestion?: number | null }).marksPerQuestion ?? null,
          }}
          authHeaders={gate.headers}
          onClose={() => setQuestionsExam(null)}
          onChanged={() => void load()}
        />
      )}

      {notice && <p role="status" className={noticeClass(notice)}>{notice.text}</p>}
    </section>
  );
}
