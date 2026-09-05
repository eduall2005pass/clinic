"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { AccessLoading } from "@/components/auth/AccessGuard";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import { HubHeader } from "@/components/admin/hub-ui";
import QaAskForm from "@/components/QaAskForm";
import type { QaQuestion, QaSubject } from "@/lib/qa";
import type { QaAskCardSettings } from "@/lib/qa-ask-card-settings";

/**
 * Admin → Q&A Control — Spec-compliant structure:
 * Q&A Control → Q&A Subject Cards → Total/Answered/Unanswered (clickable, subject-specific)
 *             → + Add Subject (same card design, same DB source)
 *             → Ask a Question Card Maintenance (configurable + preview)
 *
 * Subject cards visually MATCH the Main Website Q&A subject cards (QaSubjectPicker):
 * same card design, layout, icon, typography, spacing, responsive. Data comes from
 * the same DB source (fetchQaBrowseSubjects merged). The ONLY difference is
 * statistics: Main shows 2 (Total, Answered), Admin shows 3 (Total, Answered, Unanswered).
 */

// Same icons as QaSubjectPicker — keep visual parity with Main Website
const subjectIcons: Record<string, ReactNode> = {
  biology: (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M8.5 3c2.5 3-2.5 6 0 9s-2.5 6 0 9" />
      <path d="M15.5 3c-2.5 3 2.5 6 0 9s2.5 6 0 9" />
      <path d="M5 7.5h3M16 7.5h3M5 16.5h3M16 16.5h3" />
    </svg>
  ),
  chemistry: (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
    </svg>
  ),
  physics: (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <ellipse cx="12" cy="12" rx="8.5" ry="3.4" />
      <ellipse cx="12" cy="12" rx="8.5" ry="3.4" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="8.5" ry="3.4" transform="rotate(120 12 12)" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  ),
  english: (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  ),
  gk: (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  ),
  guideline: (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
    </svg>
  ),
};

function fallbackIcon(name: string) {
  return (
    <span className="text-sm font-extrabold uppercase tracking-wide">
      {name.slice(0, 2).toUpperCase()}
    </span>
  );
}

export default function AdminQaControlPage() {
  const toast = useAdminToast();
  const { user, authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [subjects, setSubjects] = useState<QaSubject[]>([]);
  const [questions, setQuestions] = useState<QaQuestion[]>([]);

  // Add subject form
  const [newSubjectName, setNewSubjectName] = useState("");
  const [addingSubject, setAddingSubject] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Ask a Question Card Maintenance
  const [askCard, setAskCard] = useState<QaAskCardSettings | null>(null);
  const [askCardLoading, setAskCardLoading] = useState(true);
  const [askCardSaving, setAskCardSaving] = useState(false);
  const [askCardDraft, setAskCardDraft] = useState<QaAskCardSettings | null>(null);

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
      const [qaRes, askCardRes] = await Promise.all([
        fetch("/api/admin/qa", {
          headers: { Authorization: `Bearer ${await user.getIdToken()}` },
          cache: "no-store",
        }),
        fetch("/api/admin/qa/ask-card", {
          headers: { Authorization: `Bearer ${await user.getIdToken()}` },
          cache: "no-store",
        }),
      ]);
      if (!qaRes.ok) throw new Error(`QA Request failed (${qaRes.status})`);
      const data = (await qaRes.json()) as {
        subjects?: QaSubject[];
        questions?: QaQuestion[];
      };
      setSubjects(Array.isArray(data.subjects) ? data.subjects : []);
      setQuestions(Array.isArray(data.questions) ? data.questions : []);
      if (askCardRes.ok) {
        const askData = (await askCardRes.json()) as QaAskCardSettings;
        setAskCard(askData);
        setAskCardDraft(askData);
      }
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
      setAskCardLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading || !user) return;
    void load();
  }, [authLoading, user, load]);

  async function call(input: RequestInfo, init: RequestInit): Promise<{ ok: boolean; error?: string }> {
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
    setShowAddForm(false);
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
    if (!window.confirm(`Delete "${subject.name}" and ALL its questions? This cannot be undone.`)) return;
    const result = await call(`/api/admin/qa?subject=${encodeURIComponent(subject.id)}`, {
      method: "DELETE",
      headers: await headers(),
    });
    if (!result.ok) {
      toast.showToast("error", result.error ?? "Failed to delete the subject.");
      return;
    }
    toast.showToast("success", `Subject "${subject.name}" deleted.`);
    void refresh();
  }

  async function saveAskCard() {
    if (!askCardDraft) return;
    setAskCardSaving(true);
    try {
      const res = await fetch("/api/admin/qa/ask-card", {
        method: "PUT",
        headers: await headers(),
        body: JSON.stringify(askCardDraft),
      });
      const data = (await res.json().catch(() => null)) as QaAskCardSettings & { error?: string } | null;
      if (!res.ok) {
        toast.showToast("error", (data as { error?: string })?.error ?? "Failed to save Ask a Question card.");
        return;
      }
      if (data) {
        setAskCard(data as QaAskCardSettings);
        setAskCardDraft(data as QaAskCardSettings);
      }
      toast.showToast("success", "Ask a Question card updated.");
    } catch {
      toast.showToast("error", "Network error while saving.");
    } finally {
      setAskCardSaving(false);
    }
  }

  const subjectStats = useMemo(() => {
    const map: Record<string, { total: number; answered: number; unanswered: number }> = {};
    for (const subject of subjects) {
      const list = questions.filter((q) => q.subjectId === subject.id);
      const answered = list.filter((q) => q.status === "answered").length;
      map[subject.id] = { total: list.length, answered, unanswered: list.length - answered };
    }
    return map;
  }, [subjects, questions]);

  // Mock options for preview — same shape as real student data
  const previewOptions = {
    categories: [
      { id: "preview-cat", name: "HSC Academic" },
      { id: "preview-cat2", name: "Medical Admission" },
    ],
    courses: [
      { id: "preview-course", name: "HSC Physics Batch", categoryId: "preview-cat" },
      { id: "preview-course2", name: "Medical Full Course", categoryId: "preview-cat2" },
    ],
    subjects: subjects.slice(0, 5).map((s) => ({ id: s.id, name: s.name, courseId: "preview-course" })),
  };

  if (authLoading || loading) {
    return <AccessLoading label="Loading Q&A Control…" />;
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <HubHeader
        eyebrow="Admin · Q&A"
        title="Q&A Control"
        description="Manage Q&A subjects and the Ask a Question card. Subject cards match the Main Website exactly — same design, same source. Statistics are calculated live from the database."
      />

      {loadError && (
        <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-6 text-center">
          <p className="text-sm text-red-400">Could not load Q&A data.</p>
          <button type="button" onClick={() => void load()} className="mt-3 rounded-xl bg-primary-600 px-4 py-2 text-xs font-bold text-white hover:bg-primary-700">
            Try Again
          </button>
        </div>
      )}

      {/* Q&A Subject Cards — MUST visually match Main Website QaSubjectPicker */}
      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-primary-500">Q&A Subject Cards</h2>
          <span className="text-xs text-neutral-500">{subjects.length} subjects · {questions.length} questions</span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-neutral-500">
          Same card design, layout, icon and typography as the Main Website. Admin cards show 3 statistics (Total / Answered / Unanswered) — each is clickable and filters that subject only.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4">
          {subjects.map((subject) => {
            const stats = subjectStats[subject.id] ?? { total: 0, answered: 0, unanswered: 0 };
            const icon = subjectIcons[subject.id] ?? subjectIcons[subject.id.toLowerCase()] ?? null;
            return (
              <div
                key={subject.id}
                className="group flex min-w-0 flex-col rounded-2xl border border-ink/10 bg-dark-900 p-4 shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-primary-600/60 hover:shadow-primary-900/30 sm:p-5"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-800 text-white shadow-md shadow-primary-900/20 transition group-hover:shadow-primary-800/50">
                    {icon ?? fallbackIcon(subject.name)}
                  </span>
                  <div className="flex shrink-0 items-center gap-1">
                    {renamingId === subject.id ? null : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setRenamingId(subject.id);
                            setRenameValue(subject.name);
                          }}
                          className="rounded-md px-1.5 py-0.5 text-[10px] font-bold text-neutral-500 hover:bg-ink/10 hover:text-neutral-300"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteSubject(subject)}
                          className="rounded-md px-1.5 py-0.5 text-[10px] font-bold text-neutral-500 hover:bg-red-500/10 hover:text-red-400"
                        >
                          Del
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {renamingId === subject.id ? (
                  <div className="mt-3 flex items-center gap-1.5">
                    <input
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void renameSubject(subject);
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                      autoFocus
                      className="w-full rounded-lg border border-primary-500/40 bg-dark-800 px-2 py-1 text-xs font-semibold text-heading outline-none"
                    />
                    <button type="button" onClick={() => void renameSubject(subject)} className="shrink-0 rounded-lg bg-emerald-600 px-2 py-1 text-xs font-bold text-white hover:bg-emerald-700">Save</button>
                    <button type="button" onClick={() => setRenamingId(null)} className="shrink-0 rounded-lg border border-ink/15 px-2 py-1 text-xs font-bold text-neutral-400">✕</button>
                  </div>
                ) : (
                  <h3 className="mt-4 truncate font-bold text-heading transition group-hover:text-primary-400">{subject.name}</h3>
                )}

                {/* THREE clickable statistics — subject-specific filtering */}
                <div className="mt-4 space-y-2">
                  <Link
                    href={`/admin/qa/${encodeURIComponent(subject.id)}`}
                    className="flex min-w-0 items-center justify-between gap-2 rounded-xl border border-ink/10 bg-ink/5 px-3 py-2 transition hover:border-primary-500/40 hover:bg-primary-500/10"
                    title="Click to view all questions for this subject"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Total Questions</span>
                    <span className="shrink-0 text-sm font-bold text-heading">{stats.total}</span>
                  </Link>
                  <Link
                    href={`/admin/qa/${encodeURIComponent(subject.id)}?status=answered`}
                    className="flex min-w-0 items-center justify-between gap-2 rounded-xl border border-ink/10 bg-ink/5 px-3 py-2 transition hover:border-emerald-500/40 hover:bg-emerald-500/10"
                    title="Click to view only answered questions for this subject"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Answered Questions</span>
                    <span className="shrink-0 text-sm font-bold text-emerald-400">{stats.answered}</span>
                  </Link>
                  <Link
                    href={`/admin/qa/${encodeURIComponent(subject.id)}?status=unanswered`}
                    className="flex min-w-0 items-center justify-between gap-2 rounded-xl border border-ink/10 bg-ink/5 px-3 py-2 transition hover:border-yellow-500/40 hover:bg-yellow-500/10"
                    title="Click to view only unanswered questions for this subject"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Unanswered Questions</span>
                    <span className="shrink-0 text-sm font-bold text-yellow-300">{stats.unanswered}</span>
                  </Link>
                </div>

                <Link
                  href={`/admin/qa/${encodeURIComponent(subject.id)}`}
                  className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-primary-900/30 transition hover:bg-primary-700 active:scale-[0.98]"
                >
                  View Questions <span aria-hidden="true">→</span>
                </Link>
              </div>
            );
          })}

          {/* + Add Subject — last card in same grid, same design system */}
          <button
            type="button"
            onClick={() => setShowAddForm((v) => !v)}
            className="group flex min-h-[220px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-ink/15 bg-dark-900/60 p-4 text-center shadow-lg shadow-black/10 transition duration-300 hover:-translate-y-1 hover:border-primary-600/60 hover:bg-dark-900 hover:shadow-primary-900/20 sm:p-5"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-dashed border-primary-500/40 bg-primary-500/10 text-primary-400 transition group-hover:border-primary-500 group-hover:bg-primary-600 group-hover:text-white">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            </span>
            <span className="mt-4 font-bold text-heading transition group-hover:text-primary-400">+ Add Subject</span>
            <span className="mt-1 text-xs text-neutral-500">Create a new Q&A subject</span>
            <span className="mt-2 text-[10px] font-bold uppercase tracking-wider text-neutral-600">Same DB — appears on Main Website instantly</span>
          </button>
        </div>

        {/* Inline Add Subject form — appears below grid when Add card is clicked */}
        {showAddForm && (
          <div className="mt-4 rounded-2xl border border-primary-600/30 bg-dark-900 p-5 shadow-lg shadow-black/20">
            <h3 className="text-sm font-bold text-heading">Add New Subject</h3>
            <p className="mt-1 text-xs text-neutral-500">New subject uses the exact same card design and becomes available on the Main Website Q&A section immediately (same database/source).</p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void addSubject();
                  if (e.key === "Escape") setShowAddForm(false);
                }}
                placeholder="Subject name (e.g. Higher Math)"
                autoFocus
                className="w-full rounded-xl border border-ink/15 bg-dark-800 px-3.5 py-2.5 text-sm text-heading outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
              />
              <button
                type="button"
                onClick={() => void addSubject()}
                disabled={addingSubject}
                className="shrink-0 rounded-xl bg-primary-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-primary-900/40 transition hover:bg-primary-700 disabled:opacity-50"
              >
                {addingSubject ? "Adding…" : "Create Subject"}
              </button>
              <button type="button" onClick={() => setShowAddForm(false)} className="shrink-0 rounded-xl border border-ink/15 bg-ink/5 px-5 py-2.5 text-sm font-bold text-neutral-400 hover:text-neutral-200">Cancel</button>
            </div>
          </div>
        )}

        {subjects.length === 0 && !showAddForm && (
          <p className="mt-4 rounded-xl border border-dashed border-ink/15 px-4 py-6 text-center text-sm text-neutral-500">No subjects yet — use + Add Subject to create the first one.</p>
        )}
      </div>

      {/* Ask a Question Card Maintenance */}
      <div className="mt-10 rounded-2xl border border-[#dbeafe] bg-white p-6 shadow-sm shadow-[#0b1e3a]/5 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] sm:p-8">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-extrabold text-heading">Ask a Question Card Maintenance</h2>
          <p className="text-xs leading-relaxed text-neutral-500 admin-dark:text-[#8da0c0]">
            Maintain the card/form that students see when they click <span className="font-bold text-primary-600 admin-dark:text-primary-400">Ask a Question</span> on the Main Website. Edit the content and preview the exact same card below. Existing student functionality (text, image, audio, teacher answers) remains unchanged.
          </p>
        </div>

        {askCardLoading ? (
          <div className="mt-6 flex items-center justify-center gap-3 rounded-xl border border-ink/10 bg-dark-900 p-8 text-sm text-neutral-400">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" /> Loading Ask a Question settings…
          </div>
        ) : askCardDraft ? (
          <div className="mt-6 grid gap-8 lg:grid-cols-2">
            {/* Editable fields */}
            <div className="space-y-4">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-widest text-neutral-500">Card Title</span>
                <input
                  value={askCardDraft.title}
                  onChange={(e) => setAskCardDraft((p) => (p ? { ...p, title: e.target.value } : p))}
                  className="mt-1.5 w-full rounded-xl border border-ink/15 bg-[#f8fbff] px-3.5 py-2.5 text-sm font-semibold text-heading outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 admin-dark:bg-[#0f2547]"
                  placeholder="Ask a Question"
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-widest text-neutral-500">Subtitle / Instruction</span>
                <textarea
                  value={askCardDraft.subtitle}
                  onChange={(e) => setAskCardDraft((p) => (p ? { ...p, subtitle: e.target.value } : p))}
                  rows={2}
                  className="mt-1.5 w-full resize-none rounded-xl border border-ink/15 bg-[#f8fbff] px-3.5 py-2.5 text-sm text-heading outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 admin-dark:bg-[#0f2547]"
                  placeholder="Select your category, enrolled course and subject..."
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-widest text-neutral-500">Question Placeholder</span>
                <input
                  value={askCardDraft.placeholder}
                  onChange={(e) => setAskCardDraft((p) => (p ? { ...p, placeholder: e.target.value } : p))}
                  className="mt-1.5 w-full rounded-xl border border-ink/15 bg-[#f8fbff] px-3.5 py-2.5 text-sm text-heading outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 admin-dark:bg-[#0f2547]"
                  placeholder="Type your question here..."
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-widest text-neutral-500">Guideline Text</span>
                <input
                  value={askCardDraft.guidelineText}
                  onChange={(e) => setAskCardDraft((p) => (p ? { ...p, guidelineText: e.target.value } : p))}
                  className="mt-1.5 w-full rounded-xl border border-ink/15 bg-[#f8fbff] px-3.5 py-2.5 text-sm text-heading outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 admin-dark:bg-[#0f2547]"
                  placeholder="Be specific — mention the chapter..."
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-widest text-neutral-500">Submit Label</span>
                  <input
                    value={askCardDraft.submitLabel}
                    onChange={(e) => setAskCardDraft((p) => (p ? { ...p, submitLabel: e.target.value } : p))}
                    className="mt-1.5 w-full rounded-xl border border-ink/15 bg-[#f8fbff] px-3.5 py-2.5 text-sm font-semibold text-heading outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 admin-dark:bg-[#0f2547]"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-widest text-neutral-500">Cancel Label</span>
                  <input
                    value={askCardDraft.cancelLabel}
                    onChange={(e) => setAskCardDraft((p) => (p ? { ...p, cancelLabel: e.target.value } : p))}
                    className="mt-1.5 w-full rounded-xl border border-ink/15 bg-[#f8fbff] px-3.5 py-2.5 text-sm font-semibold text-heading outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 admin-dark:bg-[#0f2547]"
                  />
                </label>
              </div>
              <label className="flex items-center gap-2 rounded-xl border border-ink/10 bg-[#f8fbff] px-3.5 py-2.5 admin-dark:bg-[#0f2547]">
                <input
                  type="checkbox"
                  checked={askCardDraft.showImageUpload}
                  onChange={(e) => setAskCardDraft((p) => (p ? { ...p, showImageUpload: e.target.checked } : p))}
                  className="h-4 w-4 rounded border-ink/20 text-primary-600"
                />
                <span className="text-xs font-bold uppercase tracking-widest text-neutral-500">Show Picture Upload (optional)</span>
              </label>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => void saveAskCard()}
                  disabled={askCardSaving}
                  className="flex-1 rounded-xl bg-primary-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-primary-900/20 transition hover:bg-primary-700 disabled:opacity-50"
                >
                  {askCardSaving ? "Saving…" : "Save Ask Card Settings"}
                </button>
                <button
                  type="button"
                  onClick={() => setAskCardDraft(askCard ? { ...askCard } : null)}
                  className="rounded-xl border border-ink/15 px-5 py-2.5 text-sm font-bold text-neutral-500 hover:text-neutral-700 admin-dark:text-[#8da0c0] admin-dark:hover:text-white"
                >
                  Reset
                </button>
              </div>
              <p className="text-[11px] leading-relaxed text-neutral-500">
                Changes are saved to MySQL and the Main Website students see the same card immediately. Preview on the right updates live.
              </p>
            </div>

            {/* Live Preview — same component students use */}
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-neutral-500">Live Preview — Same card students see</p>
              <div className="rounded-2xl border border-ink/10 bg-dark-950 p-3">
                <QaAskForm
                  options={previewOptions as never}
                  onSubmit={async () => {
                    toast.showToast("success", "Preview: submit works on the live site.");
                    return { ok: true };
                  }}
                  onUploadImage={async () => null}
                  onClose={() => toast.showToast("success", "Preview: close button")}
                  cardSettings={askCardDraft}
                />
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-6 text-center text-sm text-yellow-300">Could not load Ask a Question settings.</p>
        )}
      </div>
    </section>
  );
}
