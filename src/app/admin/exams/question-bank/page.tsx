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

type Question = {
  id: number | null;
  examId: string | null;
  subject: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string | null;
  marks: number;
};

const EMPTY_OPTIONS = ["", "", "", ""];

export default function QuestionBankPage() {
  const gate = useAdminGate();
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [form, setForm] = useState({
    subject: "",
    question: "",
    options: EMPTY_OPTIONS,
    correctIndex: 0,
    explanation: "",
    marks: "1",
  });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/exams/questions?examId=bank", { cache: "no-store", headers: gate.headers });
      const data = (await response.json()) as { questions?: Question[] };
      setQuestions(data.questions ?? []);
    } catch {
      setQuestions([]);
    }
  }, []);

  useEffect(() => {
    if (gate.ready) void Promise.resolve().then(load);
  }, [gate.ready, load]);

  if (!gate.ready) {
    return gate.denied ? (
      <AccessMessage title="Administrators only" message="Restricted to authorized administrators." actionLabel="Back to Admin Home" actionHref="/admin" />
    ) : (
      <AccessLoading label="Loading question bank…" />
    );
  }

  async function save() {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/exams/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...gate.headers },
        body: JSON.stringify({
          ...(editingId ? { id: editingId } : {}),
          ...form,
          marks: Number(form.marks) || 1,
        }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setNotice({ kind: "error", text: data?.error ?? "Failed to save." });
        return;
      }
      setForm({ subject: form.subject, question: "", options: EMPTY_OPTIONS, correctIndex: 0, explanation: "", marks: "1" });
      setEditingId(null);
      await load();
      setNotice({ kind: "success", text: editingId ? "Question updated." : "Question added to the bank." });
    } finally {
      setBusy(false);
    }
  }

  function startEdit(question: Question) {
    if (question.id === null) return;
    setForm({
      subject: question.subject,
      question: question.question,
      options: [...question.options],
      correctIndex: question.correctIndex,
      explanation: question.explanation ?? "",
      marks: String(question.marks),
    });
    setEditingId(question.id);
    setNotice(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function remove(id: number) {
    if (!window.confirm("Delete this question?")) return;
    setBusy(true);
    try {
      const response = await fetch("/api/admin/exams/questions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...gate.headers },
        body: JSON.stringify({ id }),
      });
      if (response.ok) await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <header>
        <h2 className="text-2xl font-extrabold tracking-tight text-[#0b1e3a] admin-dark:text-white">Question Bank</h2>
        <p className="mt-1.5 text-sm text-slate-500 admin-dark:text-slate-400">
          Reusable MCQ questions. Attach them to exams when building papers.
        </p>
      </header>

      <div className={`${cardClass} mt-5 p-4 sm:p-5`}>
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400">
          {editingId ? "Edit question" : "Add question"}
        </h3>
        <form
          className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-[1fr_120px]"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <div>
            <label className={labelClass} htmlFor="qb-subject">Subject</label>
            <input id="qb-subject" className={inputClass} value={form.subject}
              onChange={(event) => setForm({ ...form, subject: event.target.value })} />
          </div>
          <div>
            <label className={labelClass} htmlFor="qb-marks">Marks</label>
            <input id="qb-marks" type="number" step="0.5" min="0.5" className={inputClass} value={form.marks}
              onChange={(event) => setForm({ ...form, marks: event.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="qb-text">Question</label>
            <textarea id="qb-text" rows={2} className={inputClass} value={form.question}
              onChange={(event) => setForm({ ...form, question: event.target.value })} />
          </div>
          {form.options.map((option, index) => (
            <div key={index}>
              <label className={labelClass} htmlFor={`qb-opt-${index}`}>
                Option {index + 1}
                <button
                  type="button"
                  onClick={() => setForm({ ...form, correctIndex: index })}
                  className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                    form.correctIndex === index ? "bg-emerald-500/10 text-emerald-600" : "bg-zinc-500/10 text-slate-400"
                  }`}
                >
                  {form.correctIndex === index ? "correct ✓" : "mark correct"}
                </button>
              </label>
              <input id={`qb-opt-${index}`} className={inputClass} value={option}
                onChange={(event) =>
                  setForm({
                    ...form,
                    options: form.options.map((item, i) => (i === index ? event.target.value : item)),
                  })
                } />
            </div>
          ))}
          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="qb-explain">Explanation (optional)</label>
            <textarea id="qb-explain" rows={2} className={inputClass} value={form.explanation}
              onChange={(event) => setForm({ ...form, explanation: event.target.value })} />
          </div>
          <div className="sm:col-span-2 flex gap-3">
            <button type="submit" disabled={busy} className={buttonPrimaryClass}>
              {busy ? "Saving…" : editingId ? "Update Question" : "Add to Bank"}
            </button>
            {editingId && (
              <button type="button" disabled={busy} className={buttonSecondaryClass}
                onClick={() => {
                  setEditingId(null);
                  setForm({ subject: form.subject, question: "", options: EMPTY_OPTIONS, correctIndex: 0, explanation: "", marks: "1" });
                  setNotice(null);
                }}>Cancel</button>
            )}
          </div>
        </form>
      </div>

      <ul className="mt-5 space-y-3">
        {(questions ?? []).map((question) => (
          <li key={question.id} className={`${cardClass} p-4`}>
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 flex-1 text-sm font-semibold text-[#0b1e3a] admin-dark:text-zinc-100">{question.question}</p>
              <button type="button" disabled={busy} className={buttonSecondaryClass}
                onClick={() => startEdit(question)}>Edit</button>
              <button type="button" disabled={busy} aria-label="Delete question" className={buttonDangerClass}
                onClick={() => question.id !== null && void remove(question.id)}>✕</button>
            </div>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
              {question.options.map((option, index) => (
                <li key={index} className={index === question.correctIndex ? "font-bold text-emerald-600" : ""}>
                  {String.fromCharCode(65 + index)}. {option}{index === question.correctIndex ? " ✓" : ""}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-slate-400">
              {question.subject || "general"} · {question.marks} marks
            </p>
          </li>
        ))}
        {(questions ?? []).length === 0 && questions !== null && (
          <li className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-xs font-semibold text-slate-500 admin-dark:border-zinc-700">
            The bank is empty — add your first question above.
          </li>
        )}
      </ul>

      {notice && <p role="status" className={noticeClass(notice)}>{notice.text}</p>}
    </section>
  );
}
