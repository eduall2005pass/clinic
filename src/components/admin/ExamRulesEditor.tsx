"use client";

import { useCallback, useEffect, useState } from "react";
import { inputClass, labelClass } from "@/components/admin/admin-ui";

type Rule = { id: number | null; title: string; text: string };

/**
 * Per-exam rule manager (Admin → Public Exam Control → Exam → Rules).
 * Rules live in MySQL scoped strictly by exam_id — add / edit / delete /
 * reorder without touching any other exam's rules.
 */
export default function ExamRulesEditor({
  examId,
  authHeaders,
}: {
  examId: string;
  authHeaders: Record<string, string>;
}) {
  const [rules, setRules] = useState<Rule[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftText, setDraftText] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    setLoadError(false);
    try {
      const response = await fetch(
        `/api/admin/exam-rules?examId=${encodeURIComponent(examId)}`,
        { cache: "no-store", headers: authHeaders },
      );
      const data = (await response.json()) as { rules?: Rule[] };
      setRules(data.rules ?? []);
    } catch {
      setLoadError(true);
      setRules([]);
    }
  }, [examId, authHeaders]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  function startAdd() {
    setEditingRule(null);
    setDraftTitle("");
    setDraftText("");
    setShowAdd(true);
    setError(null);
  }

  function startEdit(rule: Rule) {
    setEditingRule(rule);
    setDraftTitle(rule.title);
    setDraftText(rule.text);
    setShowAdd(true);
    setError(null);
  }

  async function saveRule() {
    if (!draftText.trim()) {
      setError("Rule text is required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/exam-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          examId,
          id: editingRule?.id ?? undefined,
          title: draftTitle.trim(),
          text: draftText.trim(),
        }),
      });
      const data = (await response.json().catch(() => null)) as
        | { error?: string; rules?: Rule[] }
        | null;
      if (!response.ok || !data) {
        setError(data?.error ?? "Failed to save the rule.");
        return;
      }
      setRules(data.rules ?? []);
      setShowAdd(false);
      setEditingRule(null);
      setDraftTitle("");
      setDraftText("");
    } finally {
      setBusy(false);
    }
  }

  async function removeRule(id: number) {
    if (!window.confirm("Delete this rule?")) return;
    setBusy(true);
    try {
      const response = await fetch("/api/admin/exam-rules", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ examId, id }),
      });
      const data = (await response.json().catch(() => null)) as
        | { rules?: Rule[] }
        | null;
      if (response.ok && data?.rules) setRules(data.rules);
    } finally {
      setBusy(false);
    }
  }

  async function move(index: number, direction: -1 | 1) {
    if (!rules) return;
    const target = index + direction;
    if (target < 0 || target >= rules.length) return;
    const next = [...rules];
    [next[index], next[target]] = [next[target], next[index]];
    const ids = next.map((rule) => rule.id).filter((id): id is number => id !== null);
    setBusy(true);
    try {
      const response = await fetch("/api/admin/exam-rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ examId, order: ids }),
      });
      const data = (await response.json().catch(() => null)) as
        | { rules?: Rule[] }
        | null;
      if (response.ok && data?.rules) setRules(data.rules);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-neutral-200 p-4 admin-dark:border-zinc-700 sm:col-span-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-extrabold uppercase tracking-wide text-zinc-900 admin-dark:text-zinc-100">
            Exam Rules
          </h4>
          <p className="mt-0.5 text-xs text-zinc-500">
            Shown to students on this exam&apos;s Rules Page only.
          </p>
        </div>
        {!showAdd && (
          <button
            type="button"
            onClick={startAdd}
            className="shrink-0 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-bold text-primary-600 transition hover:border-primary-500 admin-dark:border-zinc-700"
          >
            + Add Rule
          </button>
        )}
      </div>

      {rules === null && !loadError && (
        <p className="mt-4 text-xs text-zinc-500">Loading rules…</p>
      )}

      {loadError && (
        <div className="mt-4">
          <p className="text-xs font-semibold text-red-500">Something went wrong.</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-2 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-bold admin-dark:border-zinc-700"
          >
            Try Again
          </button>
        </div>
      )}

      {rules !== null && !loadError && rules.length === 0 && !showAdd && (
        <p className="mt-4 rounded-xl border border-dashed border-neutral-200 p-4 text-center text-xs text-zinc-500 admin-dark:border-zinc-700">
          No Rules Added — the student Rules Page falls back to MediSpark&apos;s standard rules.
        </p>
      )}

      {rules !== null && rules.length > 0 && (
        <ul className="mt-4 space-y-2">
          {rules.map((rule, index) => (
            <li
              key={rule.id ?? index}
              className="flex items-start justify-between gap-3 rounded-xl border border-neutral-200 p-3 admin-dark:border-zinc-700"
            >
              <div className="min-w-0 flex-1">
                {rule.title && (
                  <p className="text-xs font-bold text-zinc-900 admin-dark:text-zinc-100">
                    {index + 1}. {rule.title}
                  </p>
                )}
                <p className={`text-xs leading-relaxed text-zinc-500 admin-dark:text-zinc-400 ${rule.title ? "" : "font-bold"}`}>
                  {rule.title ? "" : `${index + 1}. `}
                  {rule.text}
                </p>
              </div>
              <span className="flex shrink-0 items-center gap-1">
                <span className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    disabled={busy || index === 0}
                    aria-label={`Move rule ${index + 1} up`}
                    onClick={() => void move(index, -1)}
                    className="rounded border border-neutral-200 px-1.5 text-[10px] text-zinc-500 disabled:opacity-30 admin-dark:border-zinc-700"
                  >↑</button>
                  <button
                    type="button"
                    disabled={busy || index === rules.length - 1}
                    aria-label={`Move rule ${index + 1} down`}
                    onClick={() => void move(index, 1)}
                    className="rounded border border-neutral-200 px-1.5 text-[10px] text-zinc-500 disabled:opacity-30 admin-dark:border-zinc-700"
                  >↓</button>
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => startEdit(rule)}
                  className="rounded-lg border border-neutral-200 px-2 py-1 text-[11px] font-bold text-zinc-600 disabled:opacity-40 admin-dark:border-zinc-700 admin-dark:text-zinc-300"
                >
                  Edit
                </button>
                <button
                  type="button"
                  disabled={busy}
                  aria-label="Delete rule"
                  onClick={() => rule.id !== null && void removeRule(rule.id)}
                  className="rounded-lg border border-red-200 px-2 py-1 text-[11px] font-bold text-red-500 disabled:opacity-40 admin-dark:border-red-900"
                >
                  ✕
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {showAdd && (
        <div className="mt-4 space-y-3 rounded-xl border border-primary-500/40 bg-primary-500/5 p-3">
          <p className="text-xs font-extrabold uppercase tracking-wide text-primary-600">
            {editingRule ? "Edit Rule" : "New Rule"}
          </p>
          <div>
            <label className={`${labelClass} mb-1 block`} htmlFor={`rule-title-${examId}`}>
              Title (optional)
            </label>
            <input
              id={`rule-title-${examId}`}
              className={inputClass}
              value={draftTitle}
              placeholder="e.g. Negative Marking"
              onChange={(event) => setDraftTitle(event.target.value)}
            />
          </div>
          <div>
            <label className={`${labelClass} mb-1 block`} htmlFor={`rule-text-${examId}`}>
              Rule Text
            </label>
            <textarea
              id={`rule-text-${examId}`}
              className={`${inputClass} min-h-[70px]`}
              value={draftText}
              placeholder="Each wrong answer deducts 0.25 marks…"
              onChange={(event) => setDraftText(event.target.value)}
            />
          </div>
          {error && <p className="text-xs font-semibold text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void saveRule()}
              className="rounded-lg bg-primary-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-primary-700 disabled:opacity-50"
            >
              {busy ? "Saving…" : editingRule ? "Update Rule" : "Add Rule"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAdd(false);
                setEditingRule(null);
                setError(null);
              }}
              className="rounded-lg border border-neutral-200 px-4 py-2 text-xs font-bold text-zinc-600 admin-dark:border-zinc-700 admin-dark:text-zinc-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
