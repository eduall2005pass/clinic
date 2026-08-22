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
  buttonSecondaryClass,
  buttonDangerClass,
  type Notice,
} from "@/components/admin/admin-ui";

type Subject = {
  id: string;
  name: string;
  isActive: boolean;
  assignedCourseSlugs: string[];
};

type CourseOption = { slug: string; name: string };

export default function SubjectsPage() {
  const gate = useAdminGate();
  const [subjects, setSubjects] = useState<Subject[] | null>(null);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const [assignId, setAssignId] = useState<string | null>(null);
  const [assignDraft, setAssignDraft] = useState<string[]>([]);

  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/course-subjects", { cache: "no-store" });
      const data = (await response.json()) as {
        subjects?: Subject[];
        courses?: CourseOption[];
      };
      setSubjects(data.subjects ?? []);
      setCourses(data.courses ?? []);
    } catch {
      setSubjects([]);
    }
  }, []);

  useEffect(() => {
    if (gate.ready) void Promise.resolve().then(load);
  }, [gate.ready, load]);

  if (!gate.ready) {
    return gate.denied ? (
      <AccessMessage title="Administrators only" message="Restricted to authorized administrators." actionLabel="Back to Admin Home" actionHref="/admin" />
    ) : (
      <AccessLoading label="Loading subjects…" />
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
      const response = await fetch("/api/admin/course-subjects", {
        ...init,
        headers: { "Content-Type": "application/json", ...gate.headers },
        body: JSON.stringify(body),
      });
      const data = (await response.json().catch(() => null)) as
        | { error?: string; subjects?: Subject[] }
        | null;
      if (!response.ok) {
        setNotice({ kind: "error", text: data?.error ?? "Request failed." });
        return false;
      }
      if (data?.subjects) setSubjects(data.subjects);
      setNotice({ kind: "success", text: successText });
      return true;
    } catch {
      setNotice({ kind: "error", text: "Request failed. Please try again." });
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleCreate() {
    if (!name.trim()) return;
    const ok = await request(
      { method: "PUT" },
      { subjects: [...(subjects ?? []), { name: name.trim(), isActive: true }] },
      "Subject created.",
    );
    if (ok) setName("");
  }

  async function saveEdit(subject: Subject) {
    const ok = await request(
      { method: "PATCH" },
      { id: subject.id, name: editName },
      `"${editName.trim()}" updated.`,
    );
    if (ok) setEditingId(null);
  }

  async function toggleActive(subject: Subject) {
    await request(
      { method: "PATCH" },
      { id: subject.id, isActive: !subject.isActive },
      subject.isActive ? `"${subject.name}" disabled.` : `"${subject.name}" enabled.`,
    );
  }

  async function move(index: number, direction: -1 | 1) {
    if (!subjects) return;
    const target = index + direction;
    if (target < 0 || target >= subjects.length) return;
    const next = [...subjects];
    [next[index], next[target]] = [next[target], next[index]];
    // Order is implied by array position in the bulk save.
    await request(
      { method: "PUT" },
      {
        subjects: next.map((subject, order) => ({
          id: subject.id,
          name: subject.name,
          isActive: subject.isActive,
          assignedCourseSlugs: subject.assignedCourseSlugs,
          _order: order,
        })),
      },
      "Display order updated.",
    );
    await load();
  }

  function openAssign(subject: Subject) {
    setAssignId(subject.id);
    setAssignDraft([...subject.assignedCourseSlugs]);
  }

  async function saveAssignments(subject: Subject) {
    const ok = await request(
      { method: "PATCH" },
      { id: subject.id, assignedCourseSlugs: assignDraft },
      `Assignments saved for "${subject.name}".`,
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

  const iconButton =
    "flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-zinc-500 transition hover:border-primary-500/60 hover:text-primary-600 admin-dark:border-zinc-700 admin-dark:text-zinc-400 disabled:cursor-not-allowed disabled:opacity-30";

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <header>
        <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 admin-dark:text-zinc-50">Subjects</h2>
        <p className="mt-1.5 text-sm text-zinc-500 admin-dark:text-zinc-400">
          Create, edit, reorder and enable/disable subjects — and assign them to
          courses. Changes go live immediately.
        </p>
      </header>

      <div className={`${cardClass} mt-5 p-4 sm:p-5`}>
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void handleCreate();
          }}
        >
          <input className={`${inputClass} min-w-0 flex-1`} placeholder="New subject name…" value={name}
            onChange={(event) => setName(event.target.value)} aria-label="Subject name" />
          <button type="submit" disabled={busy || !name.trim()} className={buttonPrimaryClass}>+ Add</button>
        </form>

        <ul className="mt-4 space-y-2">
          {(subjects ?? []).map((subject, index) => {
            const assignedCount = subject.assignedCourseSlugs.length;
            return (
              <li key={subject.id} className={`rounded-xl border px-4 py-3 ${
                subject.isActive
                  ? "border-transparent bg-neutral-50 admin-dark:bg-zinc-800/60"
                  : "border-dashed border-neutral-300 opacity-60 admin-dark:border-zinc-700"
              }`}>
                <div className="flex items-center gap-3">
                  <input type="checkbox" className="h-4 w-4 accent-primary-600" checked={subject.isActive}
                    aria-label={`Enable ${subject.name}`}
                    onChange={() => void toggleActive(subject)} />

                  {editingId === subject.id ? (
                    <span className="flex min-w-0 flex-1 items-center gap-2">
                      <input className={`${inputClass} min-w-0 flex-1`} value={editName} autoFocus
                        onChange={(event) => setEditName(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") void saveEdit(subject);
                          if (event.key === "Escape") setEditingId(null);
                        }} aria-label="Subject name" />
                      <button type="button" className={buttonSecondaryClass} disabled={busy}
                        onClick={() => void saveEdit(subject)}>Save</button>
                      <button type="button" className={buttonSecondaryClass} disabled={busy}
                        onClick={() => setEditingId(null)}>Cancel</button>
                    </span>
                  ) : (
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-sm font-semibold ${subject.isActive ? "text-zinc-900 admin-dark:text-zinc-100" : "text-zinc-400 line-through"}`}>
                        {index + 1}. {subject.name}
                      </span>
                      <span className="block text-xs text-zinc-500 admin-dark:text-zinc-400">
                        {assignedCount === 0
                          ? "Not assigned to any course"
                          : `Assigned to ${assignedCount} course${assignedCount > 1 ? "s" : ""}`}
                      </span>
                    </span>
                  )}

                  <span className="flex shrink-0 gap-1">
                    <button type="button" disabled={busy} aria-label={`Edit ${subject.name}`} className={iconButton}
                      onClick={() => {
                        setEditingId(subject.id);
                        setEditName(subject.name);
                      }}>✎</button>
                    <button type="button" disabled={busy} aria-label={`Assign courses to ${subject.name}`} className={iconButton}
                      onClick={() => openAssign(subject)}>📚</button>
                    <button type="button" disabled={busy || index === 0} aria-label={`Move ${subject.name} up`} className={iconButton}
                      onClick={() => void move(index, -1)}>↑</button>
                    <button type="button" disabled={busy || index === (subjects?.length ?? 0) - 1} aria-label={`Move ${subject.name} down`} className={iconButton}
                      onClick={() => void move(index, 1)}>↓</button>
                    <button type="button" disabled={busy} aria-label={`Delete ${subject.name}`} className={buttonDangerClass}
                      onClick={() => setDeleteTarget(subject)}>✕</button>
                  </span>
                </div>

                {assignId === subject.id && (
                  <div className="mt-3 rounded-lg border border-neutral-200 p-3 admin-dark:border-zinc-700">
                    <p className={labelClass}>Assign &quot;{subject.name}&quot; to courses</p>
                    {courses.length === 0 ? (
                      <p className="text-xs text-zinc-500 admin-dark:text-zinc-400">
                        No courses available yet.
                      </p>
                    ) : (
                      <div className="mt-1 grid max-h-48 gap-1 overflow-y-auto sm:grid-cols-2">
                        {courses.map((course) => (
                          <label key={course.slug} className="flex items-center gap-2 text-xs font-medium text-zinc-700 admin-dark:text-zinc-300">
                            <input
                              type="checkbox"
                              className="h-3.5 w-3.5 accent-primary-600"
                              checked={assignDraft.includes(course.slug)}
                              onChange={(event) =>
                                setAssignDraft((prev) =>
                                  event.target.checked
                                    ? [...prev, course.slug]
                                    : prev.filter((slug) => slug !== course.slug),
                                )
                              }
                            />
                            <span className="truncate">{course.name}</span>
                            <span className="truncate text-[10px] text-zinc-400">/{course.slug}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" className={buttonSecondaryClass} disabled={busy}
                        onClick={() => void saveAssignments(subject)}>Save assignments</button>
                      <button type="button" className={buttonSecondaryClass} disabled={busy}
                        onClick={() => setAssignId(null)}>Cancel</button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
          {(subjects ?? []).length === 0 && (
            <li className="rounded-xl border border-dashed border-neutral-300 p-4 text-center text-xs font-semibold text-zinc-500 admin-dark:border-zinc-700">
              No subjects yet.
            </li>
          )}
        </ul>
      </div>

      {notice && <p role="status" className={noticeClass(notice)}>{notice.text}</p>}

      <AdminConfirmDialog
        open={deleteTarget !== null}
        title="Delete this subject?"
        message={
          deleteTarget
            ? `"${deleteTarget.name}" will be removed from the course system along with its course assignments and chapters. This cannot be undone.`
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
