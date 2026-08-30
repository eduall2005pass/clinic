"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AccessLoading } from "@/components/auth/AccessGuard";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import type { QaQuestion, QaSubject } from "@/lib/qa";

type Tab = "all" | "unanswered" | "answered";

const TABS: Array<{ key: Tab; label: string }> = [
  { key: "all", label: "All Questions" },
  { key: "unanswered", label: "Unanswered" },
  { key: "answered", label: "Answered" },
];

const EMPTY_TEXT: Record<Tab, string> = {
  all: "No Questions Found",
  unanswered: "No Unanswered Questions",
  answered: "No Answered Questions",
};

/**
 * Level 2 — Subject Question Management. Only questions of THIS subject are
 * fetched (backend WHERE subject_id = ?) and the All/Unanswered/Answered
 * tabs are filtered server-side too (?status=). Answering reuses the
 * existing POST /api/admin/qa { action: "answer" } endpoint.
 */
export default function SubjectQuestionsPage({
  params,
}: {
  params: Promise<{ subject: string }>;
}) {
  const { subject: subjectId } = use(params);
  const toast = useAdminToast();
  const { user, authLoading } = useAuth();
  const [state, setState] = useState<"loading" | "invalid" | "error" | "ready">(
    "loading",
  );
  const [subject, setSubject] = useState<QaSubject | null>(null);
  const [tab, setTab] = useState<Tab>("all");
  const [questions, setQuestions] = useState<QaQuestion[]>([]);
  const [counts, setCounts] = useState<{ all: number; unanswered: number; answered: number } | null>(
    null,
  );
  const [loadingTab, setLoadingTab] = useState(false);
  const [answerFor, setAnswerFor] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  async function headers(): Promise<Record<string, string>> {
    if (!user) throw new Error("Not signed in");
    return {
      Authorization: `Bearer ${await user.getIdToken()}`,
      "Content-Type": "application/json",
    };
  }

  // Load the subject + All tab counts once.
  const loadSubject = useCallback(async () => {
    if (!user) return;
    setState("loading");
    try {
      const res = await fetch(
        `/api/admin/qa?subject=${encodeURIComponent(subjectId)}`,
        { headers: await headers(), cache: "no-store" },
      );
      if (res.status === 404) {
        setState("invalid");
        return;
      }
      if (!res.ok) throw new Error("failed");
      const data = (await res.json()) as {
        subject?: QaSubject;
        questions?: QaQuestion[];
      };
      setSubject(data.subject ?? null);
      const list = Array.isArray(data.questions) ? data.questions : [];
      if (tab === "all") setQuestions(list);
      setCounts({
        all: list.length,
        unanswered: list.filter((q) => q.status === "unanswered").length,
        answered: list.filter((q) => q.status === "answered").length,
      });
      setState("ready");
    } catch {
      setState("error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, subjectId]);

  // Load questions for the selected tab — backend-filtered every time.
  const loadTab = useCallback(
    async (nextTab: Tab) => {
      if (!user) return;
      setLoadingTab(true);
      try {
        const qs =
          nextTab === "all"
            ? ""
            : `&status=${nextTab}`;
        const res = await fetch(
          `/api/admin/qa?subject=${encodeURIComponent(subjectId)}${qs}`,
          { headers: await headers(), cache: "no-store" },
        );
        if (!res.ok) throw new Error("failed");
        const data = (await res.json()) as { questions?: QaQuestion[] };
        setQuestions(Array.isArray(data.questions) ? data.questions : []);
      } catch {
        toast.showToast("error", "Failed to load questions.");
      } finally {
        setLoadingTab(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, subjectId],
  );

  useEffect(() => {
    if (authLoading || !user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSubject();
  }, [authLoading, user, loadSubject]);

  function switchTab(nextTab: Tab) {
    setTab(nextTab);
    void loadTab(nextTab);
  }

  async function refresh() {
    await Promise.all([loadSubject(), loadTab(tab)]);
  }

  async function saveAnswer(question: QaQuestion) {
    const content = (drafts[question.id] ?? "").trim();
    if (content.length < 2) {
      toast.showToast("error", "Write an answer first.");
      return;
    }
    setBusyIds((prev) => new Set(prev).add(question.id));
    try {
      const res = await fetch("/api/admin/qa", {
        method: "POST",
        headers: await headers(),
        body: JSON.stringify({ action: "answer", questionId: question.id, content }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        toast.showToast("error", data?.error ?? "Failed to save the answer.");
        return;
      }
      toast.showToast("success", "Answer saved — visible to the student now.");
      setAnswerFor(null);
      setDrafts((prev) => ({ ...prev, [question.id]: "" }));
      await refresh();
    } catch {
      toast.showToast("error", "Network error.");
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(question.id);
        return next;
      });
    }
  }

  async function deleteQuestion(question: QaQuestion) {
    if (!window.confirm("Delete this question permanently?")) return;
    setBusyIds((prev) => new Set(prev).add(question.id));
    try {
      const res = await fetch(
        `/api/admin/qa?question=${encodeURIComponent(question.id)}`,
        { method: "DELETE", headers: await headers() },
      );
      if (!res.ok) {
        toast.showToast("error", "Failed to delete the question.");
        return;
      }
      toast.showToast("success", "Question deleted.");
      await refresh();
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(question.id);
        return next;
      });
    }
  }

  if (authLoading || state === "loading") {
    return <AccessLoading label="Loading subject questions…" />;
  }

  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link
        href="/admin/qa"
        className="text-sm font-semibold text-neutral-400 hover:text-[#1a3a78]"
      >
        ← Q&A Control
      </Link>

      {state === "invalid" && (
        <div className="mt-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-6 text-center">
          <p className="text-sm font-bold text-yellow-300">
            Invalid subject / Subject not found
          </p>
          <Link
            href="/admin/qa"
            className="mt-3 inline-block rounded-xl bg-primary-600 px-4 py-2 text-xs font-bold text-white hover:bg-primary-700"
          >
            Back
          </Link>
        </div>
      )}

      {state === "error" && (
        <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-6 text-center">
          <p className="text-sm text-red-400">Something went wrong while loading questions.</p>
          <button
            type="button"
            onClick={() => void loadSubject()}
            className="mt-3 rounded-xl bg-primary-600 px-4 py-2 text-xs font-bold text-white hover:bg-primary-700"
          >
            Try Again
          </button>
        </div>
      )}

      {state === "ready" && subject && (
        <>
          <h1 className="mt-3 break-words text-2xl font-extrabold uppercase text-heading">
            {subject.name}
          </h1>
          <p className="mt-1 text-sm text-neutral-400">
            Only this subject&apos;s questions are shown — Category → Enrolled
            Course → Subject stays attached to every question.
          </p>

          {/* Tabs */}
          <div className="mt-5 flex flex-wrap gap-2">
            {TABS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => switchTab(key)}
                className={`rounded-xl border px-4 py-2 text-xs font-bold transition ${
                  tab === key
                    ? "border-primary-500/60 bg-primary-600/15 text-primary-300"
                    : "border-ink/10 bg-[#f1f5f9] admin-dark:bg-[#0a162e]/60 text-neutral-400 hover:border-primary-500/40 hover:text-neutral-200"
                }`}
              >
                {label}
                {counts && (
                  <span className="ml-1.5 text-[10px] opacity-70">
                    ({counts[key]})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Question list */}
          {loadingTab ? (
            <div className="mt-6">
              <AccessLoading label="Loading questions…" />
            </div>
          ) : questions.length === 0 ? (
            <p className="mt-6 rounded-xl border border-dashed border-ink/15 px-4 py-8 text-center text-sm text-neutral-500">
              {EMPTY_TEXT[tab]}
            </p>
          ) : (
            <ul className="mt-6 space-y-3">
              {questions.map((question) => {
                const busy = busyIds.has(question.id);
                const answering = answerFor === question.id;
                return (
                  <li
                    key={question.id}
                    className="rounded-xl border border-ink/10 bg-[#f1f5f9] admin-dark:bg-[#0a162e]/60 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="min-w-0 flex-1 text-sm font-semibold text-heading">
                        {question.text}
                      </p>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                          question.status === "answered"
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-yellow-500/15 text-yellow-300"
                        }`}
                      >
                        {question.status}
                      </span>
                    </div>

                    <p className="mt-1 text-[11px] text-neutral-500">
                      {question.studentName} · {question.createdAt}
                    </p>

                    {(question.categoryName ||
                      question.courseName ||
                      question.subjectName) && (
                      <p className="mt-1.5 flex flex-wrap items-center gap-1 text-[11px] font-semibold text-primary-300/80">
                        {[
                          question.categoryName ?? question.categoryId,
                          question.courseName ?? question.courseId,
                          question.subjectName ?? question.subjectId,
                        ]
                          .filter((part) => Boolean(part))
                          .map((part, index) => (
                            <span key={`${part}-${index}`} className="flex items-center gap-1">
                              {index > 0 && <span className="text-neutral-600">→</span>}
                              <span>{part}</span>
                            </span>
                          ))}
                      </p>
                    )}

                    {question.imageUrl && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={question.imageUrl}
                        alt="Question attachment"
                        className="mt-3 max-h-64 w-auto max-w-full rounded-lg border border-ink/10 object-contain"
                      />
                    )}

                    {question.answer && !answering && (
                      <div className="mt-2 rounded-lg bg-ink/5 px-3 py-2 text-xs leading-relaxed text-neutral-300">
                        <span className="font-bold text-primary-400">
                          {question.answer.teacherName}
                          {question.answer.answeredAt
                            ? ` · ${question.answer.answeredAt}`
                            : ""}
                          :
                        </span>{" "}
                        {question.answer.content}
                      </div>
                    )}

                    {answering && (
                      <>
                        <textarea
                          rows={3}
                          value={drafts[question.id] ?? question.answer?.content ?? ""}
                          onChange={(event) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [question.id]: event.target.value,
                            }))
                          }
                          placeholder={
                            question.status === "answered"
                              ? "Edit the answer…"
                              : "Write a teacher answer…"
                          }
                          className="mt-3 w-full resize-none rounded-xl border border-ink/15 bg-[#f8fbff] admin-dark:bg-[#0f2547] px-3.5 py-2.5 text-sm text-heading outline-none focus:border-[#2f6bce]/60"
                        />
                        <div className="mt-2 flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setAnswerFor(null)}
                            disabled={busy}
                            className="rounded-lg border border-ink/15 px-3 py-1.5 text-xs font-bold text-neutral-400 transition hover:text-neutral-200 disabled:opacity-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => void saveAnswer(question)}
                            disabled={busy}
                            className="rounded-lg bg-primary-600 px-4 py-1.5 text-xs font-bold text-white transition hover:bg-primary-700 disabled:opacity-50"
                          >
                            {busy ? "Saving…" : question.status === "answered" ? "Update Answer" : "Submit Answer"}
                          </button>
                        </div>
                      </>
                    )}

                    {!answering && (
                      <div className="mt-2 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => void deleteQuestion(question)}
                          disabled={busy}
                          className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setAnswerFor(question.id)}
                          disabled={busy}
                          className={`rounded-lg px-4 py-1.5 text-xs font-bold text-white transition disabled:opacity-50 ${
                            question.status === "answered"
                              ? "border border-emerald-500/30 bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30"
                              : "bg-primary-600 hover:bg-primary-700"
                          }`}
                        >
                          {question.status === "answered" ? "View / Edit Answer" : "Answer"}
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
