"use client";

import { useCallback, useEffect, useState } from "react";
import {
  cardClass,
  inputClass,
  labelClass,
  buttonPrimaryClass,
  buttonSecondaryClass,
  buttonDangerClass,
} from "./admin-ui";

type ExamQuestion = {
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

/**
 * Per-exam MCQ maker. Shows the exam's questions in a modal and lets an
 * admin add (or remove) synced questions via /api/admin/exams/questions.
 */
export default function ExamQuestions({
  exam,
  authHeaders,
  onClose,
  onChanged,
}: {
  exam: { id: string; title: string; subject: string };
  authHeaders: Record<string, string>;
  onClose: () => void;
  /** Called whenever the question set changes so the exam list can refresh. */
  onChanged?: () => void;
}) {
  const [questions, setQuestions] = useState<ExamQuestion[] | null>(null);
  const [bankQuestions, setBankQuestions] = useState<ExamQuestion[] | null>(null);
  const [form, setForm] = useState({
    subject: exam.subject || "",
    question: "",
    options: EMPTY_OPTIONS,
    correctIndex: 0,
    explanation: "",
    marks: "1",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/admin/exams/questions?examId=${encodeURIComponent(exam.id)}`,
        { cache: "no-store" },
      );
      const data = (await response.json()) as { questions?: ExamQuestion[] };
      setQuestions(data.questions ?? []);
    } catch {
      setQuestions([]);
    }
  }, [exam.id]);

  // Reusable bank questions (same subject first) available to attach.
  const loadBank = useCallback(async () => {
    try {
      const query = exam.subject
        ? `?examId=bank&subject=${encodeURIComponent(exam.subject)}`
        : "?examId=bank";
      const response = await fetch(`/api/admin/exams/questions${query}`, { cache: "no-store" });
      const data = (await response.json()) as { questions?: ExamQuestion[] };
      setBankQuestions(data.questions ?? []);
    } catch {
      setBankQuestions([]);
    }
  }, [exam.subject]);

  useEffect(() => {
    void Promise.resolve().then(load);
    void Promise.resolve().then(loadBank);
  }, [load, loadBank]);

  async function addQuestion() {
    setError(null);
    setBusy(true);
    try {
      const response = await fetch("/api/admin/exams/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          ...form,
          examId: exam.id,
          marks: Number(form.marks) || 1,
        }),
      });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!response.ok) {
        setError(data?.error ?? "Failed to save the question.");
        return;
      }
      setForm({
        subject: form.subject,
        question: "",
        options: EMPTY_OPTIONS,
        correctIndex: 0,
        explanation: "",
        marks: form.marks,
      });
      await load();
      onChanged?.();
    } finally {
      setBusy(false);
    }
  }

  async function removeQuestion(id: number | null) {
    if (id === null) return;
    if (!window.confirm("Remove this question from the exam?")) return;
    setBusy(true);
    try {
      await fetch("/api/admin/exams/questions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ id }),
      });
      await load();
      onChanged?.();
    } finally {
      setBusy(false);
    }
  }

  async function attachFromBank(id: number) {
    setError(null);
    setBusy(true);
    try {
      const response = await fetch("/api/admin/exams/questions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ id, examId: exam.id }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(data?.error ?? "Failed to attach the question.");
        return;
      }
      await load();
      onChanged?.();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`${cardClass} max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-b-none p-5 sm:rounded-2xl sm:p-6`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-extrabold text-[#0b1e3a] admin-dark:text-zinc-100">
              Questions · {exam.title}
            </h3>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {(questions ?? []).length} question{(questions ?? []).length === 1 ? "" : "s"} on this exam
            </p>
          </div>
          <button type="button" onClick={onClose} className={buttonSecondaryClass}>
            Close
          </button>
        </div>

        {/* Add-question (MCQ maker) form */}
        <h4 className="mt-5 text-sm font-extrabold uppercase tracking-wider text-slate-400">
          Add MCQ
        </h4>
        <form
          className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-[1fr_120px]"
          onSubmit={(event) => {
            event.preventDefault();
            void addQuestion();
          }}
        >
          <div>
            <label className={labelClass} htmlFor="eq-subject">Subject</label>
            <input
              id="eq-subject"
              className={inputClass}
              value={form.subject}
              onChange={(event) => setForm({ ...form, subject: event.target.value })}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="eq-marks">Marks</label>
            <input
              id="eq-marks"
              type="number"
              step="0.5"
              min="0.5"
              className={inputClass}
              value={form.marks}
              onChange={(event) => setForm({ ...form, marks: event.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="eq-text">Question</label>
            <textarea
              id="eq-text"
              rows={2}
              required
              className={inputClass}
              value={form.question}
              onChange={(event) => setForm({ ...form, question: event.target.value })}
            />
          </div>
          {form.options.map((option, index) => (
            <div key={index}>
              <label className={labelClass} htmlFor={`eq-opt-${index}`}>
                Option {index + 1}
                <button
                  type="button"
                  onClick={() => setForm({ ...form, correctIndex: index })}
                  className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                    form.correctIndex === index
                      ? "bg-emerald-500/10 text-emerald-600"
                      : "bg-zinc-500/10 text-slate-400"
                  }`}
                >
                  {form.correctIndex === index ? "correct ✓" : "mark correct"}
                </button>
              </label>
              <input
                id={`eq-opt-${index}`}
                className={inputClass}
                value={option}
                onChange={(event) =>
                  setForm({
                    ...form,
                    options: form.options.map((item, i) =>
                      i === index ? event.target.value : item,
                    ),
                  })
                }
              />
            </div>
          ))}
          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="eq-explain">Explanation (optional)</label>
            <textarea
              id="eq-explain"
              rows={2}
              className={inputClass}
              value={form.explanation}
              onChange={(event) => setForm({ ...form, explanation: event.target.value })}
            />
          </div>
          {error ? (
            <p className="sm:col-span-2 text-xs font-bold text-red-500">{error}</p>
          ) : null}
          <div className="sm:col-span-2 flex flex-wrap gap-3">
            <button type="submit" disabled={busy} className={buttonPrimaryClass}>
              {busy ? "Saving…" : "+ Add Question"}
            </button>
            <button
              type="button"
              disabled={busy}
              className={buttonSecondaryClass}
              onClick={() => setForm({ ...form, options: [...form.options, ""] })}
            >
              + Extra option
            </button>
          </div>
        </form>

        {/* Assign questions from the reusable bank */}
        <h4 className="mt-6 text-sm font-extrabold uppercase tracking-wider text-slate-400">
          Assign from question bank
          {exam.subject ? ` · ${exam.subject}` : ""}
        </h4>
        <ul className="mt-3 space-y-2">
          {(bankQuestions ?? []).map((question) => (
            <li key={`bank-${question.id}`} className={`${cardClass} flex items-center gap-3 p-3`}>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-[#0b1e3a] admin-dark:text-zinc-100">
                  {question.question}
                </span>
                <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  {question.subject || "general"} · {question.marks} marks
                </span>
              </span>
              <button
                type="button"
                disabled={busy}
                className={buttonSecondaryClass}
                onClick={() => question.id !== null && void attachFromBank(question.id)}
              >
                + Attach
              </button>
            </li>
          ))}
          {(bankQuestions ?? []).length === 0 && bankQuestions !== null && (
            <li className="rounded-xl border border-dashed border-neutral-300 p-4 text-center text-xs font-semibold text-slate-500 admin-dark:border-zinc-700">
              No bank questions available{exam.subject ? " for this subject" : ""}.
            </li>
          )}
        </ul>

        {/* Existing questions */}
        <ul className="mt-6 space-y-3 border-t border-neutral-200 pt-5 admin-dark:border-zinc-800">
          {(questions ?? []).map((question) => (
            <li key={question.id} className={`${cardClass} p-4`}>
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 flex-1 text-sm font-semibold text-[#0b1e3a] admin-dark:text-zinc-100">
                  {question.question}
                </p>
                <button
                  type="button"
                  disabled={busy}
                  aria-label="Delete question"
                  className={buttonDangerClass}
                  onClick={() => void removeQuestion(question.id)}
                >
                  ✕
                </button>
              </div>
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                {question.options.map((option, index) => (
                  <li
                    key={index}
                    className={index === question.correctIndex ? "font-bold text-emerald-600" : ""}
                  >
                    {String.fromCharCode(65 + index)}. {option}
                    {index === question.correctIndex ? " ✓" : ""}
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
              No questions yet — add the first MCQ above.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
