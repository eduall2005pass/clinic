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

export type Exam = {
  id: string;
  title: string;
  kind: "public" | "practice" | "enrolled";
  batchId: string;
  subject: string;
  courseType: "Academic" | "Admission";
  durationMinutes: number;
  totalMarks: number;
  negativeMarks: number;
  questionCount: number;
  status: "draft" | "published" | "closed";
  scheduledAt: string | null;
  endsAt: string | null;
  answerKey: Record<string, number> | null;
  courseIds?: string[];
};

const EMPTY = {
  id: "",
  title: "",
  kind: "public" as Exam["kind"],
  batchId: "hsc-28",
  subject: "",
  courseType: "Academic" as "Academic" | "Admission",
  durationMinutes: "30",
  negativeMarks: "0.25",
  totalMarks: "",
  status: "draft" as "draft" | "published" | "closed",
  scheduledAt: "",
  endsAt: "",
};

type CourseOption = { slug: string; name: string };

export default function ExamManager({
  title,
  description,
  kindFilter,
  allowEnrolled = false,
}: {
  title: string;
  description: string;
  kindFilter?: "public" | "practice" | "enrolled";
  /** Show the "Enrolled" kind + course assignment picker. */
  allowEnrolled?: boolean;
}) {
  const gate = useAdminGate();
  const [exams, setExams] = useState<Exam[] | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [courseIds, setCourseIds] = useState<string[]>([]);
  const [courseOptions, setCourseOptions] = useState<CourseOption[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [questionsExam, setQuestionsExam] = useState<Exam | null>(null);

  const load = useCallback(async () => {
    try {
      const query = kindFilter ? `?kind=${kindFilter}` : "";
      const response = await fetch(`/api/admin/exams${query}`, { cache: "no-store" });
      const data = (await response.json()) as { exams?: Exam[] };
      setExams(data.exams ?? []);
    } catch {
      setExams([]);
    }
  }, [kindFilter]);

  useEffect(() => {
    if (gate.ready) void Promise.resolve().then(load);
  }, [gate.ready, load]);

  // Course options for the enrolled-exam assignment picker.
  useEffect(() => {
    if (!gate.ready || !allowEnrolled) return;
    fetch("/api/admin/course-subjects", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { courses?: CourseOption[] }) => setCourseOptions(data.courses ?? []))
      .catch(() => setCourseOptions([]));
  }, [gate.ready, allowEnrolled]);

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
    setEditingId(null);
    setShowForm(true);
    setNotice(null);
  }

  function startEdit(exam: Exam) {
    setForm({
      id: exam.id,
      title: exam.title,
      kind: exam.kind,
      batchId: exam.batchId || "hsc-28",
      subject: exam.subject,
      courseType: exam.courseType,
      durationMinutes: String(exam.durationMinutes),
      negativeMarks: String(exam.negativeMarks),
      totalMarks: exam.totalMarks ? String(exam.totalMarks) : "",
      status: exam.status,
      scheduledAt: exam.scheduledAt ? exam.scheduledAt.slice(0, 16) : "",
      endsAt: exam.endsAt ? exam.endsAt.slice(0, 16) : "",
    });
    setCourseIds(exam.courseIds ?? []);
    setEditingId(exam.id);
    setShowForm(true);
    setNotice(null);
  }

  async function save() {
    if (form.kind === "enrolled" && courseIds.length === 0) {
      setNotice({ kind: "error", text: "Assign at least one course to an enrolled exam." });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...gate.headers },
        body: JSON.stringify({
          ...form,
          courseIds: form.kind === "enrolled" ? courseIds : [],
          durationMinutes: Number(form.durationMinutes) || 30,
          negativeMarks: Number(form.negativeMarks) || 0,
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

  async function remove(id: string, name: string) {
    if (!window.confirm(`Delete “${name}” with its questions, enrollments and results?`)) return;
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

  return (
    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 admin-dark:text-zinc-50">{title}</h2>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-zinc-500 admin-dark:text-zinc-400">{description}</p>
        </div>
        <button type="button" onClick={startCreate} className={buttonPrimaryClass}>+ New Exam</button>
      </header>

      {exams === null ? (
        <p className={`${cardClass} mt-5 p-6 text-center text-sm text-zinc-500`}>Loading…</p>
      ) : exams.length === 0 ? (
        <p className={`${cardClass} mt-5 p-8 text-center text-sm text-zinc-500`}>No exams yet.</p>
      ) : (
        <ul className="mt-5 space-y-3">
          {exams.map((exam) => (
            <li key={exam.id} className={`${cardClass} p-4 sm:p-5`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-base font-bold text-zinc-900 admin-dark:text-zinc-100">{exam.title}</h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${
                        exam.status === "published"
                          ? "bg-emerald-500/10 text-emerald-600"
                          : exam.status === "closed"
                            ? "bg-red-500/10 text-red-500"
                            : "bg-zinc-500/10 text-zinc-500"
                      }`}
                    >
                      {exam.status}
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-semibold text-zinc-500">
                    {exam.kind} · {exam.subject || "general"} · {exam.questionCount} questions ·{" "}
                    {exam.totalMarks} marks · {exam.durationMinutes} min
                    {exam.negativeMarks > 0 && ` · −${exam.negativeMarks} negative`}
                  </p>
                  {exam.kind === "enrolled" && (
                    <p className="mt-1 text-xs font-semibold text-zinc-500">
                      Courses:{" "}
                      {exam.courseIds && exam.courseIds.length > 0
                        ? exam.courseIds
                            .map((id) => courseOptions.find((option) => option.slug === id)?.name ?? id)
                            .join(", ")
                        : "none assigned"}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" onClick={() => setQuestionsExam(exam)} className={buttonSecondaryClass}>
                    Questions ({exam.questionCount})
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void toggleStatus(exam)}
                    className={buttonSecondaryClass}
                  >
                    {exam.status === "published" ? "Unpublish" : "Publish"}
                  </button>
                  <button type="button" onClick={() => startEdit(exam)} className={buttonSecondaryClass}>Edit</button>
                  <button type="button" onClick={() => void remove(exam.id, exam.title)} disabled={busy}
                    aria-label={`Delete ${exam.title}`} className={buttonDangerClass}>✕</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true">
          <div className={`${cardClass} max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-b-none p-5 sm:rounded-2xl sm:p-6`}>
            <h3 className="text-lg font-extrabold text-zinc-900 admin-dark:text-zinc-100">
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
                <select id="ex-kind" className={inputClass} value={form.kind}
                  onChange={(event) => setForm({ ...form, kind: event.target.value as Exam["kind"] })}>
                  <option value="public">Public</option>
                  <option value="practice">Practice</option>
                  {allowEnrolled && <option value="enrolled">Enrolled (course students)</option>}
                </select>
              </div>
              {allowEnrolled && form.kind === "enrolled" && (
                <div className="sm:col-span-2">
                  <span className={labelClass}>Assign courses (students enrolled in any of these)</span>
                  {courseOptions.length === 0 ? (
                    <p className="mt-1 text-xs text-zinc-500">Loading courses…</p>
                  ) : (
                    <div className="mt-2 max-h-44 space-y-1.5 overflow-y-auto rounded-xl border border-neutral-200 p-3 admin-dark:border-zinc-700">
                      {courseOptions.map((course) => (
                        <label key={course.slug} className="flex items-center gap-2 text-sm text-zinc-700 admin-dark:text-zinc-200">
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
                          <span className="ml-auto shrink-0 text-[10px] font-bold uppercase tracking-wide text-zinc-400">{course.slug}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
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
                <label className={labelClass} htmlFor="ex-duration">Duration (minutes)</label>
                <input id="ex-duration" type="number" min="1" className={inputClass} value={form.durationMinutes}
                  onChange={(event) => setForm({ ...form, durationMinutes: event.target.value })} />
              </div>
              <div>
                <label className={labelClass} htmlFor="ex-neg">Negative marks per wrong answer</label>
                <input id="ex-neg" type="number" step="0.25" min="0" className={inputClass} value={form.negativeMarks}
                  onChange={(event) => setForm({ ...form, negativeMarks: event.target.value })} />
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
