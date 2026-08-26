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
  buttonDangerClass,
  type Notice,
} from "@/components/admin/admin-ui";

type Chapter = { id: string; name: string; subjectId: string };
type CourseClass = {
  id: string;
  chapterId: string;
  title: string;
  videoUrl: string | null;
  noteUrl: string | null;
  durationMinutes: number;
  isFree: boolean;
};

export default function ClassesPage() {
  const gate = useAdminGate();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [classes, setClasses] = useState<CourseClass[] | null>(null);
  const [form, setForm] = useState({ chapterId: "", title: "", videoUrl: "", noteUrl: "", durationMinutes: "0", isFree: false });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const load = useCallback(async () => {
    try {
      const [chaptersResponse, classesResponse] = await Promise.all([
        fetch("/api/admin/chapters", { cache: "no-store", headers: gate.headers }),
        fetch("/api/admin/classes", { cache: "no-store", headers: gate.headers }),
      ]);
      const chaptersData = (await chaptersResponse.json()) as { chapters?: Chapter[] };
      const classesData = (await classesResponse.json()) as { classes?: CourseClass[] };
      setChapters(chaptersData.chapters ?? []);
      setClasses(classesData.classes ?? []);
    } catch {
      setClasses([]);
    }
  }, []);

  useEffect(() => {
    if (gate.ready) void Promise.resolve().then(load);
  }, [gate.ready, load]);

  if (!gate.ready) {
    return gate.denied ? (
      <AccessMessage title="Administrators only" message="Restricted to authorized administrators." actionLabel="Back to Admin Home" actionHref="/admin" />
    ) : (
      <AccessLoading label="Loading classes…" />
    );
  }

  async function create() {
    if (!form.title.trim() || !form.chapterId) {
      setNotice({ kind: "error", text: "Select a chapter and enter a class title." });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...gate.headers },
        body: JSON.stringify({
          ...(editingId ? { id: editingId } : {}),
          ...form,
          title: form.title.trim(),
          durationMinutes: Number(form.durationMinutes) || 0,
        }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string; classes?: CourseClass[] } | null;
      if (!response.ok) {
        setNotice({ kind: "error", text: data?.error ?? "Failed to save." });
        return;
      }
      setClasses(data?.classes ?? []);
      setForm({ chapterId: "", title: "", videoUrl: "", noteUrl: "", durationMinutes: "0", isFree: false });
      setEditingId(null);
      setNotice({ kind: "success", text: editingId ? "Class updated." : "Class added." });
    } finally {
      setBusy(false);
    }
  }

  function startEdit(item: CourseClass) {
    setEditingId(item.id);
    setForm({
      chapterId: item.chapterId,
      title: item.title,
      videoUrl: item.videoUrl ?? "",
      noteUrl: item.noteUrl ?? "",
      durationMinutes: String(item.durationMinutes ?? 0),
      isFree: item.isFree,
    });
    setNotice(null);
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this class?")) return;
    setBusy(true);
    try {
      const response = await fetch("/api/admin/classes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...gate.headers },
        body: JSON.stringify({ id }),
      });
      const data = (await response.json().catch(() => null)) as { classes?: CourseClass[] } | null;
      if (data?.classes) setClasses(data.classes);
    } finally {
      setBusy(false);
    }
  }

  async function move(index: number, direction: -1 | 1) {
    if (!classes) return;
    const target = index + direction;
    if (target < 0 || target >= classes.length) return;
    const next = [...classes];
    [next[index], next[target]] = [next[target], next[index]];
    setBusy(true);
    try {
      const response = await fetch("/api/admin/classes", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...gate.headers },
        body: JSON.stringify({ order: next.map((item) => item.id) }),
      });
      const data = (await response.json().catch(() => null)) as { classes?: CourseClass[] } | null;
      if (data?.classes) setClasses(data.classes);
    } finally {
      setBusy(false);
    }
  }

  const chapterLabel = (id: string) => chapters.find((chapter) => chapter.id === id)?.name ?? id;

  const iconButton =
    "flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-slate-500 transition hover:border-[#93c5fd] hover:text-[#1a3a78] admin-dark:border-zinc-700 admin-dark:text-slate-400 disabled:cursor-not-allowed disabled:opacity-30";

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <header>
        <h2 className="text-2xl font-extrabold tracking-tight text-[#0b1e3a] admin-dark:text-white">Classes</h2>
        <p className="mt-1.5 text-sm text-slate-500 admin-dark:text-slate-400">
          Video classes under each chapter. Add, edit, reorder and delete.
        </p>
      </header>

      <div className={`${cardClass} mt-5 p-4 sm:p-5`}>
        {chapters.length === 0 ? (
          <p className="text-sm text-slate-500">Add chapters first from Courses → Chapters.</p>
        ) : (
          <form
            className="grid grid-cols-1 gap-3 sm:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              void create();
            }}
          >
            {editingId && (
              <p className="sm:col-span-2 rounded-lg border border-primary-500/40 bg-primary-600/10 px-3 py-2 text-xs font-bold text-primary-600 admin-dark:text-primary-300">
                Editing class — change the fields and press &quot;Save Class&quot;.
              </p>
            )}
            <div>
              <label className={labelClass} htmlFor="cls-chapter">Chapter</label>
              <select id="cls-chapter" className={inputClass} value={form.chapterId}
                onChange={(event) => setForm({ ...form, chapterId: event.target.value })}>
                <option value="">Select…</option>
                {chapters.map((chapter) => (
                  <option key={chapter.id} value={chapter.id}>{chapter.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="cls-title">Title</label>
              <input id="cls-title" className={inputClass} value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })} />
            </div>
            <div>
              <label className={labelClass} htmlFor="cls-video">Video URL</label>
              <input id="cls-video" className={inputClass} value={form.videoUrl}
                onChange={(event) => setForm({ ...form, videoUrl: event.target.value })} />
            </div>
            <div>
              <label className={labelClass} htmlFor="cls-note">Note URL (PDF)</label>
              <input id="cls-note" className={inputClass} value={form.noteUrl}
                onChange={(event) => setForm({ ...form, noteUrl: event.target.value })} />
            </div>
            <div>
              <label className={labelClass} htmlFor="cls-duration">Duration (minutes)</label>
              <input id="cls-duration" type="number" min="0" className={inputClass} value={form.durationMinutes}
                onChange={(event) => setForm({ ...form, durationMinutes: event.target.value })} />
            </div>
            <div className="flex items-end justify-between gap-3">
              <label className="flex items-center gap-2 pb-1 text-sm font-semibold text-slate-700 admin-dark:text-zinc-200">
                <input type="checkbox" className="h-4 w-4 accent-primary-600" checked={form.isFree}
                  onChange={(event) => setForm({ ...form, isFree: event.target.checked })} />
                Free preview
              </label>
              <div className="flex items-end gap-2">
                {editingId && (
                  <button type="button" disabled={busy}
                    onClick={() => {
                      setEditingId(null);
                      setForm({ chapterId: "", title: "", videoUrl: "", noteUrl: "", durationMinutes: "0", isFree: false });
                    }}
                    className="rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-semibold text-zinc-600 transition hover:border-[#93c5fd] admin-dark:border-zinc-700 admin-dark:text-zinc-300">
                    Cancel
                  </button>
                )}
                <button type="submit" disabled={busy} className={buttonPrimaryClass}>
                  {editingId ? "Save Class" : "+ Add"}
                </button>
              </div>
            </div>
          </form>
        )}

        <ul className="mt-5 space-y-2">
          {(classes ?? []).map((item, index) => (
            <li key={item.id} className="flex items-center gap-3 rounded-xl bg-[#f8fbff] px-4 py-2.5 admin-dark:bg-[#132a4f]/60">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-[#0b1e3a] admin-dark:text-zinc-100">
                  {index + 1}. {item.title}{item.isFree ? " · Free" : ""}
                </span>
                <span className="block truncate text-xs text-slate-500">
                  {chapterLabel(item.chapterId)} · {item.videoUrl ? "video ✓" : "no video"}
                </span>
              </span>
              <span className="flex shrink-0 gap-1">
                <button type="button" disabled={busy || index === 0} aria-label={`Move ${item.title} up`} className={iconButton}
                  onClick={() => void move(index, -1)}>↑</button>
                <button type="button" disabled={busy || index === (classes?.length ?? 0) - 1} aria-label={`Move ${item.title} down`} className={iconButton}
                  onClick={() => void move(index, 1)}>↓</button>
                <button type="button" disabled={busy} aria-label={`Edit ${item.title}`} className={iconButton}
                  onClick={() => startEdit(item)}>✎</button>
                <button type="button" disabled={busy} aria-label={`Delete ${item.title}`} className={buttonDangerClass}
                  onClick={() => void remove(item.id)}>
                  ✕
                </button>
              </span>
            </li>
          ))}
          {(classes ?? []).length === 0 && (
            <li className="rounded-xl border border-dashed border-neutral-300 p-4 text-center text-xs font-semibold text-slate-500 admin-dark:border-zinc-700">
              No classes yet.
            </li>
          )}
        </ul>
      </div>

      {notice && <p role="status" className={noticeClass(notice)}>{notice.text}</p>}
    </section>
  );
}
