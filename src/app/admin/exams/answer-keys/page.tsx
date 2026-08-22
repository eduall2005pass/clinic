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
  type Notice,
} from "@/components/admin/admin-ui";
import type { Exam } from "@/components/admin/ExamManager";

export default function AnswerKeysPage() {
  const gate = useAdminGate();
  const [exams, setExams] = useState<Exam[] | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [keyText, setKeyText] = useState("{}");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/exams", { cache: "no-store" });
      const data = (await response.json()) as { exams?: Exam[] };
      setExams(data.exams ?? []);
    } catch {
      setExams([]);
    }
  }, []);

  useEffect(() => {
    if (gate.ready) void Promise.resolve().then(load);
  }, [gate.ready, load]);

  useEffect(() => {
    const exam = (exams ?? []).find((item) => item.id === selectedId);
    void Promise.resolve().then(() => setKeyText(JSON.stringify(exam?.answerKey ?? {}, null, 2)));
  }, [selectedId, exams]);

  if (!gate.ready) {
    return gate.denied ? (
      <AccessMessage title="Administrators only" message="Restricted to authorized administrators." actionLabel="Back to Admin Home" actionHref="/admin" />
    ) : (
      <AccessLoading label="Loading answer keys…" />
    );
  }

  async function save() {
    let parsed: unknown;
    try {
      parsed = JSON.parse(keyText);
    } catch {
      setNotice({ kind: "error", text: "Invalid JSON — use {\"1\": 2, \"2\": 0} format." });
      return;
    }
    const exam = (exams ?? []).find((item) => item.id === selectedId);
    if (!exam) return;
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...gate.headers },
        body: JSON.stringify({ ...exam, scheduledAt: exam.scheduledAt, answerKey: parsed }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setNotice({ kind: "error", text: data?.error ?? "Failed to save the key." });
        return;
      }
      await load();
      setNotice({ kind: "success", text: `Answer key saved for “${exam.title}”.` });
    } finally {
      setBusy(false);
    }
  }

  const selected = (exams ?? []).find((item) => item.id === selectedId);

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <header>
        <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 admin-dark:text-zinc-50">Answer Keys</h2>
        <p className="mt-1.5 text-sm text-zinc-500 admin-dark:text-zinc-400">
          Per-question correct answers as JSON — keys are question numbers, values are option indexes (0 = A).
          Example: <code className="rounded bg-zinc-100 px-1 admin-dark:bg-zinc-800">{`{"1": 2, "2": 0}`}</code>
        </p>
      </header>

      <div className={`${cardClass} mt-5 p-4 sm:p-5`}>
        {(exams ?? []).length === 0 ? (
          <p className="text-sm text-zinc-500">No exams yet.</p>
        ) : (
          <>
            <div>
              <label className={labelClass} htmlFor="ak-exam">Exam</label>
              <select id="ak-exam" className={inputClass} value={selectedId}
                onChange={(event) => setSelectedId(event.target.value)}>
                <option value="">Select an exam…</option>
                {(exams ?? []).map((exam) => (
                  <option key={exam.id} value={exam.id}>{exam.title} ({exam.questionCount} Q)</option>
                ))}
              </select>
            </div>
            {selected && (
              <>
                <div className="mt-4">
                  <label className={labelClass} htmlFor="ak-key">Answer key JSON</label>
                  <textarea id="ak-key" rows={8} spellCheck={false}
                    className={`${inputClass} font-mono text-xs`} value={keyText}
                    onChange={(event) => setKeyText(event.target.value)} />
                </div>
                <button type="button" onClick={() => void save()} disabled={busy} className={`${buttonPrimaryClass} mt-4`}>
                  {busy ? "Saving…" : `Save Key for “${selected.title}”`}
                </button>
              </>
            )}
          </>
        )}
      </div>

      {notice && <p role="status" className={noticeClass(notice)}>{notice.text}</p>}
    </section>
  );
}
