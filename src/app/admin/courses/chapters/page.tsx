"use client";

import { useCallback, useEffect, useState } from "react";
import { AccessLoading, AccessMessage } from "@/components/auth/AccessGuard";
import AdminConfirmDialog from "@/components/admin/AdminConfirmDialog";
import {
  useAdminGate,
  noticeClass,
  cardClass,
  inputClass,
  labelClass,
  buttonPrimaryClass,
  buttonDangerClass,
  type Notice,
} from "@/components/admin/admin-ui";

type Subject = { id: string; name: string; isActive: boolean };
type Chapter = { id: string; subjectId: string; name: string; isActive: boolean };

export default function ChaptersPage() {
  const gate = useAdminGate();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[] | null>(null);
  const [name, setName] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [assignId, setAssignId] = useState<string | null>(null);
  const [assignDraft, setAssignDraft] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<Chapter | null>(null);

  const load = useCallback(async () => {
    try {
      const [subjectsResponse, chaptersResponse] = await Promise.all([
        fetch("/api/admin/course-subjects", { cache: "no-store" }),
        fetch("/api/admin/chapters", { cache: "no-store" }),
      ]);
      const subjectsData = (await subjectsResponse.json()) as { subjects?: Subject[] };
      const chaptersData = (await chaptersResponse.json()) as { chapters?: Chapter[] };
      setSubjects((subjectsData.subjects ?? []).filter((item) => item.isActive));
      setChapters(chaptersData.chapters ?? []);
    } catch {
      setChapters([]);
    }
  }, []);

  useEffect(() => {
    if (gate.ready) void Promise.resolve().then(load);
  }, [gate.ready, load]);

  if (!gate.ready) {
    return gate.denied ? (
      <AccessMessage title="Administrators only" message="Restricted to authorized administrators." actionLabel="Back to Admin Home" actionHref="/admin" />
    ) : (
      <AccessLoading label="Loading chapters…" />
    );
  }

  async function request(
    init: RequestInit & { method: string },
    body: unknown,
    successText: string,
  ): Promise<boolean> {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/chapters", {
        ...init,
        headers: { "Content-Type": "application/json", ...gate.headers },
        body: JSON.stringify(body),
      });
      const data = (await response.json().catch(() => null)) as
        | { error?: string; chapters?: Chapter[] }
        | null;
      if (!response.ok) {
        setNotice({ kind: "error", text: data?.error ?? "Request failed." });
        return false;
      }
      if (data?.chapters) setChapters(data.chapters);
      setNotice({ kind: "success", text: successText });
      return true;
    } catch {
      setNotice({ kind: "error", text: "Request failed. Please try again." });
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function create() {
    if (!name.trim() || !subjectId) {
      setNotice({ kind: "error", text: "Select a subject and enter a chapter name." });
      return;
    }
    const ok = await request(
      { method: "POST" },
      { name: name.trim(), subjectId },
      "Chapter added.",
    );
    if (ok) setName("");
  }

  async function saveEdit(chapter: Chapter) {
    const ok = await request(
      { method: "PATCH" },
      { id: chapter.id, name: editName },
      "Chapter renamed.",
    );
    if (ok) setEditingId(null);
  }

  async function toggleActive(chapter: Chapter) {
    await request(
      { method: "PATCH" },
      { id: chapter.id, isActive: !chapter.isActive },
      chapter.isActive ? `"${chapter.name}" disabled.` : `"${chapter.name}" enabled.`,
    );
  }

  async function move(index: number, direction: -1 | 1) {
    if (!chapters) return;
    const target = index + direction;
    if (target < 0 || target >= chapters.length) return;
    const next = [...chapters];
    [next[index], next[target]] = [next[target], next[index]];
    await request(
      { method: "PUT" },
      { order: next.map((chapter) => chapter.id) },
      "Display order updated.",
    );
  }

  function openAssign(chapter: Chapter) {
    setAssignId(chapter.id);
    setAssignDraft(chapter.subjectId);
  }

  async function saveAssignment(chapter: Chapter) {
    if (!assignDraft) {
      setNotice({ kind: "error", text: "Select a subject." });
      return;
    }
    const ok = await request(
      { method: "PATCH" },
      { id: chapter.id, subjectId: assignDraft },
      `"${chapter.name}" moved to ${subjectName(assignDraft)}.`,
    );
    if (ok) setAssignId(null);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const ok = await request(
      { method: "DELETE" },
      { id: deleteTarget.id },
      `"${deleteTarget.name}" deleted.`,
    );
    if (ok) setDeleteTarget(null);
  }

  function subjectName(id: string) {
    return subjects.find((item) => item.id === id)?.name ?? id;
  }

  const iconButton =
    "flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-zinc-500 transition hover:border-primary-500/60 hover:text-primary-600 admin-dark:border-zinc-700 admin-dark:text-zinc-400 disabled:cursor-not-allowed disabled:opacity-30";

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <header>
        <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 admin-dark:text-zinc-50">Chapters</h2>
        <p className="mt-1.5 text-sm text-zinc-500 admin-dark:text-zinc-400">
          Create, edit, reorder and enable/disable chapters — and assign them
          to subjects. Changes go live immediately.
        </p>
      </header>

      <div className={`${cardClass} mt-5 p-4 sm:p-5`}>
        {subjects.length === 0 ? (
          <p className="text-sm text-zinc-500">Add subjects first from Courses → Subjects.</p>
        ) : (
          <form
            className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              void create();
            }}
          >
            <div>
              <label className={labelClass} htmlFor="ch-subject">Subject</label>
              <select id="ch-subject" className={inputClass} value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>
                <option value="">Select…</option>
                {subjects.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="ch-name">Chapter name</label>
              <input id="ch-name" className={inputClass} value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="flex items-end">
              <button type="submit" disabled={busy} className={buttonPrimaryClass}>+ Add</button>
            </div>
          </form>
        )}

        <ul className="mt-5 space-y-2">
          {(chapters ?? []).map((chapter, index) => (
            <li key={chapter.id} className={`rounded-xl border px-4 py-2.5 ${
              chapter.isActive
                ? "border-transparent bg-neutral-50 admin-dark:bg-zinc-800/60"
                : "border-dashed border-neutral-300 opacity-60 admin-dark:border-zinc-700"
            }`}>
              <div className="flex items-center gap-3">
                <input type="checkbox" className="h-4 w-4 accent-primary-600" checked={chapter.isActive}
                  aria-label={`Enable ${chapter.name}`}
                  onChange={() => void toggleActive(chapter)} />

                {editingId === chapter.id ? (
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <input className={`${inputClass} min-w-0 flex-1`} value={editName} autoFocus
                      onChange={(event) => setEditName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") void saveEdit(chapter);
                        if (event.key === "Escape") setEditingId(null);
                      }} aria-label="Chapter name" />
                    <button type="button" className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-bold text-zinc-600 transition hover:border-primary-500/60 hover:text-primary-600 admin-dark:border-zinc-700 admin-dark:text-zinc-300"
                      disabled={busy}
                      onClick={() => void saveEdit(chapter)}>Save</button>
                    <button type="button" className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-bold text-zinc-600 transition hover:border-primary-500/60 hover:text-primary-600 admin-dark:border-zinc-700 admin-dark:text-zinc-300"
                      disabled={busy}
                      onClick={() => setEditingId(null)}>Cancel</button>
                  </span>
                ) : (
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-sm font-semibold ${chapter.isActive ? "text-zinc-900 admin-dark:text-zinc-100" : "text-zinc-400 line-through"}`}>
                      {index + 1}. {chapter.name}
                    </span>
                    <span className="block truncate text-xs text-zinc-500">
                      Subject: {subjectName(chapter.subjectId)}
                    </span>
                  </span>
                )}

                <span className="flex shrink-0 gap-1">
                  <button type="button" disabled={busy} aria-label={`Edit ${chapter.name}`} className={iconButton}
                    onClick={() => {
                      setEditingId(chapter.id);
                      setEditName(chapter.name);
                    }}>✎</button>
                  <button type="button" disabled={busy} aria-label={`Assign ${chapter.name} to another subject`} className={iconButton}
                    onClick={() => openAssign(chapter)}>📚</button>
                  <button type="button" disabled={busy || index === 0} aria-label={`Move ${chapter.name} up`} className={iconButton}
                    onClick={() => void move(index, -1)}>↑</button>
                  <button type="button" disabled={busy || index === (chapters?.length ?? 0) - 1} aria-label={`Move ${chapter.name} down`} className={iconButton}
                    onClick={() => void move(index, 1)}>↓</button>
                  <button type="button" disabled={busy} aria-label={`Delete ${chapter.name}`} className={buttonDangerClass}
                    onClick={() => setDeleteTarget(chapter)}>✕</button>
                </span>
              </div>

              {assignId === chapter.id && (
                <div className="mt-3 flex flex-wrap items-end gap-2 rounded-lg border border-neutral-200 p-3 admin-dark:border-zinc-700">
                  <div className="min-w-[12rem] flex-1">
                    <label className={labelClass} htmlFor={`assign-${chapter.id}`}>
                      Assign &quot;{chapter.name}&quot; to subject
                    </label>
                    <select
                      id={`assign-${chapter.id}`}
                      className={inputClass}
                      value={assignDraft}
                      onChange={(event) => setAssignDraft(event.target.value)}
                    >
                      <option value="">Select…</option>
                      {subjects.map((item) => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>
                  </div>
                  <button type="button" className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-bold text-zinc-600 transition hover:border-primary-500/60 hover:text-primary-600 admin-dark:border-zinc-700 admin-dark:text-zinc-300"
                    disabled={busy}
                    onClick={() => void saveAssignment(chapter)}>Save assignment</button>
                  <button type="button" className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-bold text-zinc-600 transition hover:border-primary-500/60 hover:text-primary-600 admin-dark:border-zinc-700 admin-dark:text-zinc-300"
                    disabled={busy}
                    onClick={() => setAssignId(null)}>Cancel</button>
                </div>
              )}
            </li>
          ))}
          {(chapters ?? []).length === 0 && (
            <li className="rounded-xl border border-dashed border-neutral-300 p-4 text-center text-xs font-semibold text-zinc-500 admin-dark:border-zinc-700">
              No chapters yet.
            </li>
          )}
        </ul>
      </div>

      {notice && <p role="status" className={noticeClass(notice)}>{notice.text}</p>}

      <AdminConfirmDialog
        open={deleteTarget !== null}
        title="Delete this chapter?"
        message={
          deleteTarget
            ? `"${deleteTarget.name}" and all of its classes will be removed from the course system. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        danger
        onConfirm={() => void confirmDelete()}
        onClose={() => setDeleteTarget(null)}
      />
    </section>
  );
}
