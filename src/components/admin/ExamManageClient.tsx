"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AccessLoading, AccessMessage } from "@/components/auth/AccessGuard";
import {
  useAdminGate,
  cardClass,
  inputClass,
  labelClass,
  buttonPrimaryClass,
  buttonSecondaryClass,
  buttonDangerClass,
  noticeClass,
  type Notice,
} from "@/components/admin/admin-ui";
import ExamPaperEditor from "@/components/admin/ExamPaperEditor";
import ExamRulesEditor from "@/components/admin/ExamRulesEditor";
import { MediaUploadField } from "@/components/admin/MediaUploadField";
import { examCategoryLabel } from "@/lib/public-exams";

type TabKey = "info" | "questions" | "rules" | "participants" | "results";
const TABS: { key: TabKey; label: string }[] = [
  { key: "info", label: "Exam Information" },
  { key: "questions", label: "Questions" },
  { key: "rules", label: "Rules" },
  { key: "participants", label: "Participants" },
  { key: "results", label: "Results" },
];

type Exam = {
  id: string;
  title: string;
  description?: string | null;
  bannerUrl?: string | null;
  kind: "public" | "practice" | "enrolled";
  batchId: string;
  subject: string;
  courseType: "Academic" | "Admission";
  durationMinutes: number;
  totalMarks: number;
  marksPerQuestion?: number | null;
  questionCount: number;
  status: "draft" | "published" | "closed";
  scheduledAt: string | null;
  endsAt: string | null;
  categoryId?: string | null;
  ruleTemplate?: string | null;
  chapterId?: string | null;
  negativeEnabled?: boolean;
  negativePerWrong?: number;
  secondTimerEnabled?: boolean;
  secondTimerDeduction?: number;
  courseIds?: string[];
  featured?: boolean;
};

type CategoryOption = { id: string; name: string; slug?: string };
type Enrollment = { id: number; examId: string; studentUid: string; studentName: string; enrolledAt: string };
type Result = {
  id: number;
  examId: string;
  studentUid: string;
  studentName: string;
  score: number;
  totalMarks: number;
  submittedAt: string;
  meritPosition?: number | null;
  timeTakenSeconds?: number | null;
};

function formatTime(s: number | null | undefined): string {
  if (s == null) return "—";
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}m ${r}s` : `${r}s`;
}

function InfoTab({
  exam,
  gateHeaders,
  onSaved,
}: {
  exam: Exam;
  gateHeaders: Record<string, string>;
  onSaved: (e: Exam) => void;
}) {
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);
  const [form, setForm] = useState({
    title: exam.title,
    kind: exam.kind,
    categoryId: exam.categoryId ?? "",
    bannerUrl: exam.bannerUrl ?? "",
    durationMinutes: String(exam.durationMinutes),
    questionCount: String(exam.questionCount || 30),
    marksPerQuestion: String(exam.marksPerQuestion ?? 1),
    subject: exam.subject ?? "",
    courseType: exam.courseType ?? "Academic",
    status: exam.status,
    scheduledAt: exam.scheduledAt ? exam.scheduledAt.slice(0, 16) : "",
    endsAt: exam.endsAt ? exam.endsAt.slice(0, 16) : "",
  });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  // Keep form in sync if exam changes externally
  useEffect(() => {
    setForm({
      title: exam.title,
      kind: exam.kind,
      categoryId: exam.categoryId ?? "",
      bannerUrl: exam.bannerUrl ?? "",
      durationMinutes: String(exam.durationMinutes),
      questionCount: String(exam.questionCount || 30),
      marksPerQuestion: String(exam.marksPerQuestion ?? 1),
      subject: exam.subject ?? "",
      courseType: exam.courseType ?? "Academic",
      status: exam.status,
      scheduledAt: exam.scheduledAt ? exam.scheduledAt.slice(0, 16) : "",
      endsAt: exam.endsAt ? exam.endsAt.slice(0, 16) : "",
    });
  }, [exam]);

  useEffect(() => {
    fetch("/api/course-categories", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { categories: [] }))
      .then((data: { categories?: CategoryOption[] }) => setCategoryOptions(data.categories ?? []))
      .catch(() => undefined);
  }, []);

  const totalMarks = useMemo(() => {
    const qc = Number(form.questionCount) || 0;
    const mpq = Number(form.marksPerQuestion) || 0;
    return qc * mpq;
  }, [form.questionCount, form.marksPerQuestion]);

  const rulePreview = useMemo(() => {
    // Cheap client preview — mirrors server detectRuleTemplate
    const cat = categoryOptions.find((c) => c.id === form.categoryId);
    const token = `${cat?.slug ?? ""} ${cat?.name ?? ""}`.toLowerCase();
    if (/medical/.test(token)) return "medical";
    if (/varsity|universit/.test(token)) return "university";
    if (/ssc|hsc|academic/.test(token)) return "academic";
    if (exam.ruleTemplate) return exam.ruleTemplate;
    return "academic";
  }, [categoryOptions, form.categoryId, exam.ruleTemplate]);

  async function save() {
    if (!form.title.trim()) {
      setNotice({ kind: "error", text: "Exam name is required." });
      return;
    }
    if (form.kind === "public" && !form.categoryId) {
      setNotice({ kind: "error", text: "Select a category for this public exam." });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...gateHeaders },
        body: JSON.stringify({
          id: exam.id,
          title: form.title.trim(),
          kind: form.kind,
          categoryId: form.categoryId || exam.categoryId || "",
          batchId: exam.batchId || "hsc-28",
          subject: form.subject,
          courseType: form.courseType,
          durationMinutes: Number(form.durationMinutes) || 30,
          questionCount: Number(form.questionCount) || 30,
          marksPerQuestion: Number(form.marksPerQuestion) || 1,
          totalMarks,
          bannerUrl: form.bannerUrl || null,
          status: form.status,
          scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null,
          endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
          // keep sort and other fields stable via existing exam
          courseIds: exam.courseIds ?? [],
          chapterId: exam.chapterId ?? null,
        }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string; exam?: Exam } | null;
      if (!res.ok) {
        setNotice({ kind: "error", text: data?.error ?? "Failed to save." });
        return;
      }
      setNotice({ kind: "success", text: "Exam information saved." });
      if (data?.exam) onSaved(data.exam);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`${cardClass} p-5 sm:p-6`}>
      <h3 className="text-sm font-extrabold uppercase tracking-widest text-[#0b1e3a] admin-dark:text-white">Exam Information</h3>
      <p className="mt-1 text-xs text-slate-500">View and edit exam settings. Auto Total Marks = Questions × Marks per Question. Rule Template is auto-selected from the category.</p>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="em-title">Exam Name</label>
          <input id="em-title" className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. HSC Biology Model Test 01" />
        </div>
        <div>
          <label className={labelClass} htmlFor="em-kind">Type</label>
          <select id="em-kind" className={inputClass} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as Exam["kind"] })}>
            <option value="public">Public</option>
            <option value="practice">Practice</option>
            <option value="enrolled">Enrolled</option>
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="em-category">Category / Course</label>
          <select id="em-category" className={inputClass} value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
            <option value="">Select a category…</option>
            {categoryOptions.map((c) => (
              <option key={c.id} value={c.id}>{examCategoryLabel(c)}</option>
            ))}
          </select>
          {exam.categoryId && !categoryOptions.find((c) => c.id === exam.categoryId) && (
            <p className="mt-1 text-[11px] text-slate-500">Current: {exam.categoryId}</p>
          )}
        </div>
        <div className="sm:col-span-2">
          <MediaUploadField
            id="em-banner"
            label="Banner"
            directory="exams"
            accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
            preview
            value={form.bannerUrl}
            onChange={(url) => setForm({ ...form, bannerUrl: url })}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="em-duration">Duration (minutes)</label>
          <input id="em-duration" type="number" min={1} className={inputClass} value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} />
        </div>
        <div>
          <label className={labelClass} htmlFor="em-status">Status</label>
          <select id="em-status" className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Exam["status"] })}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="em-qcount">Total Questions</label>
          <input id="em-qcount" type="number" min={1} max={200} className={inputClass} value={form.questionCount} onChange={(e) => setForm({ ...form, questionCount: e.target.value })} />
          <p className="mt-1 text-[11px] text-slate-500">Auto-creates slots Q01..Q{String(form.questionCount).padStart(2, "0")} on save (e.g. 30 → Q01..Q30).</p>
        </div>
        <div>
          <label className={labelClass} htmlFor="em-mpq">Marks Per Question</label>
          <input id="em-mpq" type="number" min={0.5} step={0.5} className={inputClass} value={form.marksPerQuestion} onChange={(e) => setForm({ ...form, marksPerQuestion: e.target.value })} />
        </div>
        <div>
          <label className={labelClass}>Auto Total Marks</label>
          <div className="flex h-[42px] items-center rounded-xl border border-[#dbeafe] bg-[#f8fbff] px-3.5 text-sm font-extrabold text-[#0b1e3a] admin-dark:border-[#1e3a65] admin-dark:bg-[#0f2547] admin-dark:text-white">{totalMarks}</div>
          <p className="mt-1 text-[11px] text-slate-500">{form.questionCount} × {form.marksPerQuestion || 0} = {totalMarks} marks</p>
        </div>
        <div>
          <label className={labelClass}>Auto Rule Template</label>
          <div className="flex h-[42px] items-center rounded-xl border border-[#dbeafe] bg-[#f8fbff] px-3.5 text-sm font-bold capitalize text-[#0b1e3a] admin-dark:border-[#1e3a65] admin-dark:bg-[#0f2547] admin-dark:text-white">{rulePreview}</div>
          <p className="mt-1 text-[11px] text-slate-500">From category → template (medical / academic / university).</p>
        </div>
        <div>
          <label className={labelClass} htmlFor="em-subject">Subject</label>
          <input id="em-subject" className={inputClass} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="e.g. Biology" />
        </div>
        <div>
          <label className={labelClass} htmlFor="em-courseType">Course type</label>
          <select id="em-courseType" className={inputClass} value={form.courseType} onChange={(e) => setForm({ ...form, courseType: e.target.value as "Academic" | "Admission" })}>
            <option value="Academic">Academic</option>
            <option value="Admission">Admission</option>
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="em-sched">Start time (optional)</label>
          <input id="em-sched" type="datetime-local" className={inputClass} value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} />
        </div>
        <div>
          <label className={labelClass} htmlFor="em-ends">End time (optional)</label>
          <input id="em-ends" type="datetime-local" className={inputClass} value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={() => void save()} disabled={busy} className={buttonPrimaryClass}>{busy ? "Saving…" : "Save Information"}</button>
        <Link href="/admin/public-exam" className={buttonSecondaryClass}>Back to Public Exams</Link>
      </div>
      {notice && <p role="status" className={noticeClass(notice)}>{notice.text}</p>}

      <div className="mt-6 rounded-xl border border-[#dbeafe] bg-[#f8fbff] p-3 text-xs leading-relaxed text-slate-600 admin-dark:border-[#1e3a65] admin-dark:bg-[#132a4f] admin-dark:text-slate-300">
        <span className="font-extrabold">Workflow:</span> Save → System auto-creates question slots (30 → Q01..Q30) → open Questions tab → add via Manual / Voice / Image → complete all slots → Publish.
      </div>
    </div>
  );
}

function RulesTab({ exam, headers }: { exam: Exam; headers: Record<string, string> }) {
  const template = exam.ruleTemplate ?? "—";
  const pretty = template === "medical" ? "Medical" : template === "university" ? "University" : template === "academic" ? "Academic" : template;
  return (
    <div className="space-y-4">
      <div className={`${cardClass} p-5`}>
        <h3 className="text-sm font-extrabold uppercase tracking-widest text-[#0b1e3a] admin-dark:text-white">Rules</h3>
        <p className="mt-1 text-xs text-slate-500">Selected Rule Template and applicable rules — scoped strictly to this exam.</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-[#bfdbfe] bg-[#eff6ff] px-3 py-1 text-xs font-extrabold capitalize text-[#1a3a78] admin-dark:border-[#1e3a65] admin-dark:bg-[#0f2547] admin-dark:text-[#93c5fd]">Template: {pretty}</span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 admin-dark:bg-[#0f2547] admin-dark:text-slate-300">{exam.durationMinutes} min · {exam.totalMarks} marks · {exam.questionCount} Qs</span>
        </div>
      </div>
      <ExamRulesEditor examId={exam.id} authHeaders={headers} />
    </div>
  );
}

function ParticipantsTab({ examId, headers }: { examId: string; headers: Record<string, string> }) {
  const [rows, setRows] = useState<Enrollment[] | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/exams/enrolled?examId=${encodeURIComponent(examId)}`, { cache: "no-store", headers });
      const data = (await res.json()) as { enrollments?: Enrollment[] };
      setRows(data.enrollments ?? []);
    } catch {
      setRows([]);
    } finally {
      setBusy(false);
    }
  }, [examId, headers]);
  useEffect(() => { void load(); }, [load]);
  return (
    <div className={`${cardClass} p-5`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-extrabold uppercase tracking-widest text-[#0b1e3a] admin-dark:text-white">Participants</h3>
          <p className="mt-1 text-xs text-slate-500">Students who took / enrolled in this exam.</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={busy} className={buttonSecondaryClass}>{busy ? "…" : "↻ Refresh"}</button>
      </div>
      {rows === null ? (
        <p className="mt-4 text-center text-sm text-slate-500">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-slate-500 admin-dark:border-zinc-700">No participants yet.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center gap-3 rounded-xl border border-[#eef4ff] bg-[#f8fbff] px-4 py-3 text-sm admin-dark:border-[#1e3a65]/60 admin-dark:bg-[#0f2547]">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold text-[#0b1e3a] admin-dark:text-zinc-100">{r.studentName || r.studentUid}</span>
                <span className="block text-xs text-slate-500">{new Date(r.enrolledAt).toLocaleString()}</span>
              </span>
              <span className="shrink-0 text-[11px] font-bold text-slate-500">{r.studentUid.slice(0, 8)}…</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ResultsTab({ examId, examTitle, headers }: { examId: string; examTitle: string; headers: Record<string, string> }) {
  const [rows, setRows] = useState<Result[] | null>(null);
  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/exams/results?examId=${encodeURIComponent(examId)}`, { cache: "no-store", headers });
      const data = (await res.json()) as { results?: Result[] };
      setRows(data.results ?? []);
    } catch {
      setRows([]);
    }
  }, [examId, headers]);
  useEffect(() => { void load(); }, [load]);
  return (
    <div className={`${cardClass} p-5`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-extrabold uppercase tracking-widest text-[#0b1e3a] admin-dark:text-white">Results</h3>
          <p className="mt-1 text-xs text-slate-500">Exam results and rankings for this exam.</p>
        </div>
        <button type="button" onClick={() => void load()} className={buttonSecondaryClass}>↻ Refresh</button>
      </div>
      {rows === null ? (
        <p className="mt-4 text-center text-sm text-slate-500">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-slate-500 admin-dark:border-zinc-700">No results yet.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-[#eef4ff] bg-[#f8fbff] px-4 py-3 admin-dark:border-[#1e3a65]/60 admin-dark:bg-[#0f2547]">
              {r.meritPosition != null && (
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${r.meritPosition === 1 ? "bg-amber-400/20 text-amber-600" : r.meritPosition === 2 ? "bg-zinc-500/15 text-zinc-600" : r.meritPosition === 3 ? "bg-orange-500/15 text-orange-600" : "bg-zinc-500/10 text-slate-500"}`}
                  title="Merit position"
                >#{r.meritPosition}</span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-[#0b1e3a] admin-dark:text-zinc-100">{r.studentName || r.studentUid}</span>
                <span className="block text-xs text-slate-500">{examTitle} · {new Date(r.submittedAt).toLocaleString()} · ⏱ {formatTime(r.timeTakenSeconds)}</span>
              </span>
              <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${r.totalMarks > 0 && r.score / r.totalMarks >= 0.6 ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-500"}`}>{r.score}/{r.totalMarks}</span>
              <button
                type="button"
                onClick={() => void fetch("/api/admin/exams/results", { method: "DELETE", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify({ id: r.id }) }).then(() => load())}
                className={buttonSecondaryClass}
              >Delete</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ExamManageClient({ examId }: { examId: string }) {
  const gate = useAdminGate();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabKey) || "info";
  const [active, setActive] = useState<TabKey>(TABS.some((t) => t.key === initialTab) ? initialTab : "info");
  const [exam, setExam] = useState<Exam | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);

  const setTab = useCallback((key: TabKey) => {
    setActive(key);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", key);
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const loadExam = useCallback(async () => {
    setLoadError(false);
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/exams?id=${encodeURIComponent(examId)}`, { cache: "no-store", headers: gate.headers });
      if (!res.ok) throw new Error("failed");
      const data = (await res.json()) as { exams?: Exam[] };
      const found = (data.exams ?? []).find((e) => e.id === examId) ?? null;
      if (!found) {
        // Fallback: try full list (maybe id filter missed due to caching)
        const fallback = await fetch(`/api/admin/exams`, { cache: "no-store", headers: gate.headers });
        const fbData = (await fallback.json()) as { exams?: Exam[] };
        const fbFound = (fbData.exams ?? []).find((e) => e.id === examId) ?? null;
        if (!fbFound) throw new Error("not found");
        setExam(fbFound);
      } else {
        setExam(found);
      }
    } catch {
      setLoadError(true);
      setExam(null);
    } finally {
      setLoading(false);
    }
  }, [examId, gate.headers]);

  useEffect(() => {
    if (gate.ready) void loadExam();
  }, [gate.ready, loadExam]);

  if (!gate.ready) {
    return gate.denied ? (
      <AccessMessage title="Administrators only" message="Exam management is restricted to authorized administrators." actionLabel="Back to Admin Home" actionHref="/admin" />
    ) : (
      <AccessLoading label="Loading exam…" />
    );
  }

  if (loading) {
    return <p className={`${cardClass} mx-auto max-w-5xl p-8 text-center text-sm text-slate-500`}>Loading exam…</p>;
  }

  if (loadError || !exam) {
    return (
      <div className={`${cardClass} mx-auto max-w-5xl p-8 text-center`}>
        <p className="text-sm font-bold text-red-600">Could not load exam “{examId}”.</p>
        <div className="mt-4 flex justify-center gap-2">
          <button type="button" onClick={() => void loadExam()} className={buttonPrimaryClass}>Try Again</button>
          <Link href="/admin/exams/public" className={buttonSecondaryClass}>Back to Exams</Link>
        </div>
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <nav className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
            <Link href="/admin/exams" className="hover:text-[#1a3a78]">Exams</Link>
            <span aria-hidden>→</span>
            <Link href="/admin/public-exam" className="hover:text-[#1a3a78]">Public Exam</Link>
            <span aria-hidden>→</span>
            <span className="truncate font-bold text-[#0b1e3a] admin-dark:text-zinc-100">{exam.title}</span>
          </nav>
          <h1 className="mt-2 truncate text-xl font-extrabold tracking-tight text-[#0b1e3a] admin-dark:text-white sm:text-2xl">{exam.title}</h1>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {exam.kind} · {exam.subject || "general"} · {exam.questionCount} Qs · {exam.totalMarks} marks · {exam.durationMinutes} min · <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${exam.status === "published" ? "bg-emerald-500/10 text-emerald-600" : exam.status === "closed" ? "bg-red-500/10 text-red-500" : "bg-zinc-500/10 text-slate-500"}`}>{exam.status}</span>
            {exam.ruleTemplate && <span className="ml-2 rounded-full bg-[#eff6ff] px-2 py-0.5 text-[10px] font-bold capitalize text-[#1a3a78] admin-dark:bg-[#0f2547] admin-dark:text-[#93c5fd]">{exam.ruleTemplate}</span>}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link href="/admin/exams/public" className={buttonSecondaryClass}>← Exams</Link>
          <button
            type="button"
            onClick={async () => {
              const next = exam.status === "published" ? "draft" : "published";
              await fetch("/api/admin/exams", { method: "PATCH", headers: { "Content-Type": "application/json", ...gate.headers }, body: JSON.stringify({ id: exam.id, status: next }) });
              void loadExam();
            }}
            className={buttonSecondaryClass}
          >{exam.status === "published" ? "Unpublish" : "Publish"}</button>
        </div>
      </div>

      {/* Tabs — single page, clean sections */}
      <div className="mt-6 flex gap-1 overflow-x-auto rounded-2xl border border-[#dbeafe] bg-white p-1.5 shadow-sm admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] sm:gap-1.5">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setTab(tab.key)}
            className={`shrink-0 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-extrabold tracking-wide transition sm:px-4 sm:text-sm ${active === tab.key ? "bg-[#1a3a78] text-white shadow-md admin-dark:bg-[#234e9f]" : "text-slate-600 hover:bg-[#f1f5f9] hover:text-[#0b1e3a] admin-dark:text-slate-300 admin-dark:hover:bg-[#0f2547]"}`}
            aria-current={active === tab.key ? "page" : undefined}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab bodies — one clean section per tab, no scattered pages */}
      <div className="mt-5">
        {active === "info" && <InfoTab exam={exam} gateHeaders={gate.headers} onSaved={setExam} />}
        {active === "questions" && (
          <div className="space-y-3">
            <div className={`${cardClass} p-3 sm:p-4`}>
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#0b1e3a] admin-dark:text-white">Questions — complete exam paper</h3>
              <p className="mt-1 text-xs text-slate-500">Manage all question slots Q01..Q{String(exam.questionCount).padStart(2, "0")} vertically. Manual / Voice / Image per slot. Publish unlocks when all slots are completed.</p>
            </div>
            <ExamPaperEditor
              exam={{
                id: exam.id,
                title: exam.title,
                subject: exam.subject,
                totalMarks: exam.totalMarks,
                durationMinutes: exam.durationMinutes,
                questionCount: exam.questionCount,
                status: exam.status,
                ruleTemplate: exam.ruleTemplate ?? null,
                marksPerQuestion: exam.marksPerQuestion ?? null,
              }}
              authHeaders={gate.headers}
              onClose={() => void loadExam()}
              onChanged={() => void loadExam()}
              embedded
            />
          </div>
        )}
        {active === "rules" && <RulesTab exam={exam} headers={gate.headers} />}
        {active === "participants" && <ParticipantsTab examId={exam.id} headers={gate.headers} />}
        {active === "results" && <ResultsTab examId={exam.id} examTitle={exam.title} headers={gate.headers} />}
      </div>

      <p className="mt-6 text-center text-[11px] font-semibold text-slate-400">
        One page · 5 tabs · Exam Information · Questions · Rules · Participants · Results
      </p>
    </section>
  );
}
