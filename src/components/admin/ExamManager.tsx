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
import ExamQuestions from "@/components/admin/ExamQuestions";
import ExamRulesEditor from "@/components/admin/ExamRulesEditor";
import Link from "next/link";
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
};

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
    setForm(EMPTY);
    setCourseIds([]);
    setFormCategoryId("");
    setEditingId(null);
    setEditingSortOrder(null);
    setShowForm(true);
    setNotice(null);
  }

  function startEdit(exam: Exam) {
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
    });
    setCourseIds(exam.courseIds ?? []);
    setFormCategoryId(exam.categoryId ?? "");
    setEditingSortOrder(exam.sortOrder ?? null);
    setEditingId(exam.id);
    setShowForm(true);
    setNotice(null);
  }

  async function save() {
    if (form.kind === "enrolled" && courseIds.length === 0) {
      setNotice({ kind: "error", text: "Assign at least one course to an enrolled exam." });
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
    if (form.kind === "public" && !fixedCategory && !categoryId) {
      setNotice({ kind: "error", text: "Select a category for this public exam." });
      return;
    }
    const chapterId = fixedChapter ? fixedChapter.id : form.chapterId;
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...gate.headers },
        body: JSON.stringify({
          ...form,
          ...(editingSortOrder !== null ? { sortOrder: editingSortOrder } : {}),
          chapterId,
          courseIds: form.kind === "enrolled" ? courseIds : [],
          categoryId,
          bannerUrl: form.bannerUrl,
          negativeEnabled: form.negativeEnabled,
          negativePerWrong: Number(form.negativePerWrong) || 0.25,
          secondTimerEnabled: form.secondTimerEnabled,
          secondTimerDeduction: Number(form.secondTimerDeduction) || 5,
          // Legacy column mirrors the per-exam toggle for older views.
          negativeMarks: form.negativeEnabled ? Number(form.negativePerWrong) || 0.25 : 0,
          durationMinutes: Number(form.durationMinutes) || 30,
          totalMarks: form.totalMarks ? Number(form.totalMarks) : undefined,
          scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null,
          endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
        }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string; exam?: Exam } | null;
      if (!response.ok) {
        setNotice({ kind: "error", text: data?.error ?? "Failed to save." });
        return;
      }
      setShowForm(false);
      await load();
      setNotice({ kind: "success", text: `Exam “${data?.exam?.title ?? form.title}” saved.` });
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
    if (!window.confirm(`Delete “${name}” with its questions, enrollments and results? This cannot be undone.`)) return;
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
            <li key={exam.id} className={`${cardClass} p-4 sm:p-5`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-base font-bold text-[#0b1e3a] admin-dark:text-zinc-100">{exam.title}</h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${
                        exam.status === "published"
                          ? "bg-emerald-500/10 text-emerald-600"
                          : exam.status === "closed"
                            ? "bg-red-500/10 text-red-500"
                            : "bg-zinc-500/10 text-slate-500"
                      }`}
                    >
                      {exam.status}
                    </span>
                    {exam.featured && (
                      <span
                        title="Featured in the homepage slider"
                        className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-amber-600"
                      >
                        ★ Featured
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-xs font-semibold text-slate-500">
                    {exam.kind} · {exam.subject || "general"}
                    {exam.chapterId &&
                      ` · ${chapterOptions.find((chapter) => chapter.id === exam.chapterId)?.name ?? exam.chapterId}`}{" "}
                    · {exam.questionCount} questions ·{" "}
                    {exam.totalMarks} marks · {exam.durationMinutes} min
                    {exam.negativeEnabled && ` · −${exam.negativePerWrong ?? 0.25} negative`}
                    {exam.secondTimerEnabled && ` · 2nd timer −${exam.secondTimerDeduction ?? 5}`}
                  </p>
                  {exam.kind === "enrolled" && (
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      Courses:{" "}
                      {exam.courseIds && exam.courseIds.length > 0
                        ? exam.courseIds
                            .map((id) => courseOptions.find((option) => option.slug === id)?.name ?? id)
                            .join(", ")
                        : "none assigned"}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <span className="flex flex-col gap-1">
                    <button
                      type="button"
                      disabled={busy || examIndex === 0}
                      aria-label={`Move ${exam.title} up`}
                      onClick={() => void move(examIndex, -1)}
                      className="rounded-lg border border-neutral-200 px-2 text-xs text-slate-500 transition hover:border-[#93c5fd] hover:text-[#1a3a78] admin-dark:border-zinc-700 disabled:opacity-30"
                    >↑</button>
                    <button
                      type="button"
                      disabled={busy || examIndex === (exams?.length ?? 0) - 1}
                      aria-label={`Move ${exam.title} down`}
                      onClick={() => void move(examIndex, 1)}
                      className="rounded-lg border border-neutral-200 px-2 text-xs text-slate-500 transition hover:border-[#93c5fd] hover:text-[#1a3a78] admin-dark:border-zinc-700 disabled:opacity-30"
                    >↓</button>
                  </span>
                  <button type="button" onClick={() => setQuestionsExam(exam)} className={buttonSecondaryClass}>
                    Questions ({exam.questionCount})
                  </button>
                  <button type="button" onClick={() => startEdit(exam)} className={buttonSecondaryClass}>Edit</button>
                  <Link
                    href={exam.kind === "public" ? `/admin/result-control/public-exam/${encodeURIComponent(exam.id)}` : `/admin/exams/results?examId=${encodeURIComponent(exam.id)}`}
                    className={buttonSecondaryClass}
                  >
                    View Result
                  </Link>
                  {exam.kind === "public" && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void toggleFeatured(exam)}
                      className={exam.featured ? buttonPrimaryClass : buttonSecondaryClass}
                      title="Toggle homepage slider appearance"
                    >
                      {exam.featured ? "★ Featured" : "☆ Feature"}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void duplicate(exam.id)}
                    className={buttonSecondaryClass}
                    title="Duplicate exam with questions and rules"
                  >
                    Duplicate
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void toggleArchive(exam)}
                    className={buttonSecondaryClass}
                    title={exam.status === "closed" ? "Unarchive exam" : "Archive exam"}
                  >
                    {exam.status === "closed" ? "Unarchive" : "Archive"}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void toggleStatus(exam)}
                    className={buttonSecondaryClass}
                  >
                    {exam.status === "published" ? "Unpublish" : "Publish"}
                  </button>
                  <button type="button" onClick={() => void remove(exam.id, exam.title)} disabled={busy}
                    aria-label={`Delete ${exam.title}`} className={buttonDangerClass}>✕</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Public Exam Control / Course Content Control: [+ Add Exam] sits at the end of the list. */}
      {(fixedCategory || fixedChapter) && (
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
                {fixedCategory ? (
                  <>
                    <input id="ex-kind" className={inputClass} value="Public" disabled />
                    <p className="mt-1 text-[11px] text-slate-500">
                      Category: <span className="font-bold">{examCategoryLabel(fixedCategory)}</span> (fixed — auto-assigned)
                    </p>
                  </>
                ) : (
                  <select id="ex-kind" className={inputClass} value={form.kind}
                    onChange={(event) => setForm({ ...form, kind: event.target.value as Exam["kind"] })}>
                    <option value="public">Public</option>
                    <option value="practice">Practice</option>
                    {allowEnrolled && <option value="enrolled">Enrolled (course students)</option>}
                  </select>
                )}
              </div>
              {!fixedCategory && form.kind === "public" && (
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
              {/* Per-exam rule management (exam_id-scoped, MySQL-backed). */}
              {editingId && (
                <ExamRulesEditor examId={editingId} authHeaders={gate.headers} />
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
        <ExamQuestions
          exam={{ id: questionsExam.id, title: questionsExam.title, subject: questionsExam.subject }}
          authHeaders={gate.headers}
          onClose={() => setQuestionsExam(null)}
          onChanged={() => void load()}
        />
      )}

      {notice && <p role="status" className={noticeClass(notice)}>{notice.text}</p>}
    </section>
  );
}
