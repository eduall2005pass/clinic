"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AccessLoading } from "@/components/auth/AccessGuard";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import { HubHeader } from "@/components/admin/hub-ui";
import type { QaQuestion, QaSubject } from "@/lib/qa";

/**
 * Admin → Q&A Control. Fully MySQL-backed: add/rename/delete subjects,
 * answer student questions, delete questions. Everything appears on the
 * Main Website Q&A section instantly.
 */
export default function AdminQaControlPage() {
  const toast = useAdminToast();
  const { user, authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [subjects, setSubjects] = useState<QaSubject[]>([]);
  const [questions, setQuestions] = useState<QaQuestion[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  // Add subject form
  const [newSubjectName, setNewSubjectName] = useState("");
  const [addingSubject, setAddingSubject] = useState(false);

  // Rename state
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Answer drafts per question id
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  async function headers(): Promise<Record<string, string>> {
    if (!user) throw new Error("Not signed in");
    return {
      Authorization: `Bearer ${await user.getIdToken()}`,
      "Content-Type": "application/json",
    };
  }

  const load = useCallback(async () => {
    if (!user) return;
    setLoadError(false);
    try {
      const res = await fetch("/api/admin/qa", {
        headers: { Authorization: `Bearer ${await user.getIdToken()}` },
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = (await res.json()) as {
        subjects?: QaSubject[];
        questions?: QaQuestion[];
      };
      setSubjects(Array.isArray(data.subjects) ? data.subjects : []);
      setQuestions(Array.isArray(data.questions) ? data.questions : []);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading || !user) return;
    void load();
  }, [authLoading, user, load]);

  async function call(
    input: RequestInfo,
    init: RequestInit,
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch(input, init);
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) return { ok: false, error: data?.error ?? "Request failed." };
      return { ok: true };
    } catch {
      return { ok: false, error: "Network error." };
    }
  }

  async function refresh() {
    await load();
  }

  async function addSubject() {
    const name = newSubjectName.trim();
    if (name.length < 2) {
      toast.showToast("error", "Subject name must be at least 2 characters.");
      return;
    }
    setAddingSubject(true);
    const result = await call("/api/admin/qa", {
      method: "POST",
      headers: await headers(),
      body: JSON.stringify({ action: "addSubject", name }),
    });
    setAddingSubject(false);
    if (!result.ok) {
      toast.showToast("error", result.error ?? "Failed to add the subject.");
      return;
    }
    toast.showToast("success", `Subject "${name}" added.`);
    setNewSubjectName("");
    void refresh();
  }

  async function renameSubject(subject: QaSubject) {
    const name = renameValue.trim();
    if (name.length < 2) {
      toast.showToast("error", "Subject name must be at least 2 characters.");
      return;
    }
    const result = await call("/api/admin/qa", {
      method: "PUT",
      headers: await headers(),
      body: JSON.stringify({ subjectId: subject.id, name }),
    });
    if (!result.ok) {
      toast.showToast("error", result.error ?? "Failed to rename the subject.");
      return;
    }
    toast.showToast("success", "Subject renamed.");
    setRenamingId(null);
    void refresh();
  }

  async function deleteSubject(subject: QaSubject) {
    if (
      !window.confirm(
        `Delete "${subject.name}" and ALL its questions? This cannot be undone.`,
      )
    )
      return;
    const result = await call(`/api/admin/qa?subject=${encodeURIComponent(subject.id)}`, {
      method: "DELETE",
      headers: await headers(),
    });
    if (!result.ok) {
      toast.showToast("error", result.error ?? "Failed to delete the subject.");
      return;
    }
    toast.showToast("success", `Subject "${subject.name}" deleted.`);
    if (selectedSubjectId === subject.id) setSelectedSubjectId(null);
    void refresh();
  }

  async function saveAnswer(question: QaQuestion) {
    const content = (drafts[question.id] ?? question.answer?.content ?? "").trim();
    if (content.length < 2) {
      toast.showToast("error", "Write an answer first.");
      return;
    }
    setBusyIds((prev) => new Set(prev).add(question.id));
    const result = await call("/api/admin/qa", {
      method: "POST",
      headers: await headers(),
      body: JSON.stringify({ action: "answer", questionId: question.id, content }),
    });
    setBusyIds((prev) => {
      const next = new Set(prev);
      next.delete(question.id);
      return next;
    });
    if (!result.ok) {
      toast.showToast("error", result.error ?? "Failed to save the answer.");
      return;
    }
    toast.showToast("success", "Answer saved — visible on the website now.");
    void refresh();
  }

  async function deleteQuestion(question: QaQuestion) {
    if (!window.confirm("Delete this question permanently?")) return;
    setBusyIds((prev) => new Set(prev).add(question.id));
    const result = await call(
      `/api/admin/qa?question=${encodeURIComponent(question.id)}`,
      { method: "DELETE", headers: await headers() },
    );
    setBusyIds((prev) => {
      const next = new Set(prev);
      next.delete(question.id);
      return next;
    });
    if (!result.ok) {
      toast.showToast("error", result.error ?? "Failed to delete the question.");
      return;
    }
    toast.showToast("success", "Question deleted.");
    void refresh();
  }

  const answered = useMemo(
    () => questions.filter((q) => q.status === "answered"),
    [questions],
  );

  const selectedQuestions = selectedSubjectId
    ? questions.filter((q) => q.subjectId === selectedSubjectId)
    : [];

  if (authLoading || loading) {
    return <AccessLoading label="Loading Q&A Control…" />;
  }

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);

  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <HubHeader
        eyebrow="Admin · Q&A"
        title="Q&A Management"
        description="Answer or delete student questions — each question shows its Category → Course → Subject context. Subjects come from Course Control; legacy subjects are kept below."
      />

      {/* Stats */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-primary-600/30 bg-primary-600/10 p-5 text-center">
          <p className="text-xs font-bold uppercase tracking-wide text-neutral-400">Total</p>
          <p className="mt-1 text-2xl font-extrabold text-heading">{questions.length}</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center">
          <p className="text-xs font-bold uppercase tracking-wide text-neutral-400">Answered</p>
          <p className="mt-1 text-2xl font-extrabold text-emerald-400">{answered.length}</p>
        </div>
        <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-5 text-center">
          <p className="text-xs font-bold uppercase tracking-wide text-neutral-400">Unanswered</p>
          <p className="mt-1 text-2xl font-extrabold text-yellow-300">
            {questions.length - answered.length}
          </p>
        </div>
      </div>

      {/* Add Subject */}
      <div className="mt-8 rounded-2xl border border-ink/10 bg-dark-900 p-6 shadow-lg shadow-black/20">
        <h2 className="text-lg font-bold text-heading">Subjects</h2>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={newSubjectName}
            onChange={(event) => setNewSubjectName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void addSubject();
            }}
            placeholder="New subject name (e.g. Higher Math)"
            className="w-full rounded-xl border border-ink/15 bg-dark-850 px-3.5 py-2.5 text-sm text-heading outline-none focus:border-primary-500/60"
          />
          <button
            type="button"
            onClick={() => void addSubject()}
            disabled={addingSubject}
            className="shrink-0 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-primary-900/40 transition hover:bg-primary-700 disabled:opacity-50"
          >
            {addingSubject ? "Adding…" : "+ Add Subject"}
          </button>
        </div>

        {subjects.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-ink/15 px-4 py-6 text-center text-sm text-neutral-500">
            No subjects yet — add the first one above.
          </p>
        ) : (
          <ul className="mt-4 flex flex-wrap gap-2">
            {subjects.map((subject) => (
              <li key={subject.id}>
                {renamingId === subject.id ? (
                  <span className="flex items-center gap-1.5 rounded-xl border border-primary-500/40 bg-dark-950/60 px-2.5 py-1.5">
                    <input
                      value={renameValue}
                      onChange={(event) => setRenameValue(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") void renameSubject(subject);
                      }}
                      autoFocus
                      className="w-36 bg-transparent text-xs font-semibold text-heading outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => void renameSubject(subject)}
                      className="text-xs font-bold text-emerald-400 hover:text-emerald-300"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setRenamingId(null)}
                      className="text-xs font-bold text-neutral-500 hover:text-neutral-300"
                    >
                      ✕
                    </button>
                  </span>
                ) : (
                  <span
                    className={`group inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                      selectedSubjectId === subject.id
                        ? "border-primary-500/60 bg-primary-600/15 text-primary-300"
                        : "border-ink/10 bg-dark-950/60 text-neutral-300 hover:border-primary-500/40"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedSubjectId(selectedSubjectId === subject.id ? null : subject.id)}
                    >
                      {subject.name}
                    </button>
                    <button
                      type="button"
                      aria-label={`Rename ${subject.name}`}
                      onClick={() => {
                        setRenamingId(subject.id);
                        setRenameValue(subject.name);
                      }}
                      className="text-[10px] text-neutral-500 hover:text-primary-400"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${subject.name}`}
                      onClick={() => void deleteSubject(subject)}
                      className="text-[10px] text-neutral-500 hover:text-red-400"
                    >
                      Del
                    </button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Questions for selected subject */}
      {selectedSubject && (
        <div className="mt-6 rounded-2xl border border-ink/10 bg-dark-900 p-6 shadow-lg shadow-black/20">
          <h2 className="text-lg font-bold text-heading">
            Questions — {selectedSubject.name} ({selectedQuestions.length})
          </h2>

          {selectedQuestions.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-ink/15 px-4 py-6 text-center text-sm text-neutral-500">
              No questions in this subject yet.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {selectedQuestions.map((question) => {
                const busy = busyIds.has(question.id);
                return (
                  <li
                    key={question.id}
                    className="rounded-xl border border-ink/10 bg-dark-950/60 p-4"
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

                    {question.answer && (
                      <p className="mt-2 rounded-lg bg-ink/5 px-3 py-2 text-xs leading-relaxed text-neutral-300">
                        <span className="font-bold text-primary-400">
                          {question.answer.teacherName}:
                        </span>{" "}
                        {question.answer.content}
                      </p>
                    )}

                    <textarea
                      rows={2}
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
                      className="mt-3 w-full resize-none rounded-xl border border-ink/15 bg-dark-850 px-3.5 py-2.5 text-sm text-heading outline-none focus:border-primary-500/60"
                    />

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
                        onClick={() => void saveAnswer(question)}
                        disabled={busy}
                        className="rounded-lg bg-primary-600 px-4 py-1.5 text-xs font-bold text-white transition hover:bg-primary-700 disabled:opacity-50"
                      >
                        {busy
                          ? "Saving…"
                          : question.status === "answered"
                            ? "Update Answer"
                            : "Submit Answer"}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
