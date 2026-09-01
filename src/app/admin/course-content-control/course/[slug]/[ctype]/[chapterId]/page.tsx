"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AccessLoading, AccessMessage } from "@/components/auth/AccessGuard";
import ExamManager from "@/components/admin/ExamManager";
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

type ChapterMeta = { id: string; name: string };
type CourseClass = {
  id: string;
  chapterId: string;
  title: string;
  videoUrl: string | null;
  noteUrl: string | null;
  durationMinutes: number;
  isFree: boolean;
};

// YouTube helpers
function getYouTubeId(url: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.trim());
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      return id && id.length >= 6 ? id : null;
    }
    if (host.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      const parts = u.pathname.split("/").filter(Boolean);
      const embedIdx = parts.indexOf("embed");
      if (embedIdx !== -1 && parts[embedIdx + 1]) return parts[embedIdx + 1];
      const shortsIdx = parts.indexOf("shorts");
      if (shortsIdx !== -1 && parts[shortsIdx + 1]) return parts[shortsIdx + 1];
    }
  } catch {
    // fallback regex for raw ids or malformed URLs
  }
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  if (m) return m[1];
  if (/^[A-Za-z0-9_-]{11}$/.test(url.trim())) return url.trim();
  return null;
}

function youtubeThumbnail(url: string | null): string | null {
  const id = url ? getYouTubeId(url) : null;
  if (!id) return null;
  // hqdefault is reliably available; maxresdefault may 404 for some videos
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}

export default function ChapterClassesPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; ctype: string; chapterId: string }>;
  searchParams: Promise<{ subject?: string; paper?: string }>;
}) {
  const { slug, ctype, chapterId } = use(params);
  const sp = use(searchParams);
  const gate = useAdminGate();
  const { user } = useAuth();

  const [chapter, setChapter] = useState<ChapterMeta | null>(null);
  const [chapterLoading, setChapterLoading] = useState(true);
  const [classes, setClasses] = useState<CourseClass[] | null>(null);
  const [form, setForm] = useState({
    title: "",
    videoUrl: "",
    noteUrl: "",
    durationMinutes: "0",
    isFree: false,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const decodedSlug = decodeURIComponent(slug);
  const decodedChapterId = decodeURIComponent(chapterId);
  const isClass = ctype === "class";
  const isExam = ctype === "exam";

  const backChaptersHref =
    `/admin/course-content-control/course/${encodeURIComponent(slug)}/${encodeURIComponent(ctype)}` +
    (() => {
      const qs = new URLSearchParams();
      if (sp.subject) qs.set("subject", sp.subject);
      if (sp.paper) qs.set("paper", sp.paper);
      return qs.toString() ? `?${qs.toString()}` : "";
    })();

  const loadChapter = useCallback(async () => {
    if (!user) return;
    setChapterLoading(true);
    try {
      const qs = new URLSearchParams({ course: slug, ctype });
      if (sp.subject) qs.set("subject", sp.subject);
      if (sp.paper) qs.set("paper", sp.paper);
      const res = await fetch(`/api/admin/content-control?${qs.toString()}`, {
        headers: { Authorization: `Bearer ${await user.getIdToken()}` },
        cache: "no-store",
      });
      const data = (await res.json()) as { chapters?: ChapterMeta[] };
      const found = (data.chapters ?? []).find((c) => c.id === decodedChapterId) ?? null;
      setChapter(found);
    } catch {
      setChapter(null);
    } finally {
      setChapterLoading(false);
    }
  }, [user, slug, ctype, sp.subject, sp.paper, decodedChapterId]);

  const loadClasses = useCallback(async () => {
    if (!gate.ready) return;
    try {
      const res = await fetch(`/api/admin/classes?chapterId=${encodeURIComponent(decodedChapterId)}`, {
        headers: gate.headers,
        cache: "no-store",
      });
      const data = (await res.json()) as { classes?: CourseClass[] };
      const filtered = (data.classes ?? []).filter((c) => c.chapterId === decodedChapterId);
      setClasses(filtered);
    } catch {
      setClasses([]);
    }
  }, [gate.ready, gate.headers, decodedChapterId]);

  useEffect(() => {
    if (gate.ready) void loadChapter();
  }, [gate.ready, loadChapter]);

  useEffect(() => {
    if (gate.ready) void loadClasses();
  }, [gate.ready, loadClasses]);

  if (!gate.ready) {
    return gate.denied ? (
      <AccessMessage title="Administrators only" message="Restricted to authorized administrators." actionLabel="Back" actionHref={backChaptersHref} />
    ) : (
      <AccessLoading label="Loading chapter…" />
    );
  }

  if (!isClass && !isExam) {
    return (
      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <Link href={backChaptersHref} className="text-sm font-semibold text-neutral-400 hover:text-[#1a3a78]">
          ← Back
        </Link>
        <div className="mt-6 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-8 text-center">
          <p className="font-bold text-yellow-300">This view is for Class / Exam only</p>
          <p className="mt-1 text-sm text-yellow-200/70">Chapter content management is only available when ctype is &quot;class&quot; or &quot;exam&quot;.</p>
        </div>
      </section>
    );
  }

  if (chapterLoading) return <AccessLoading label="Loading chapter…" />;

  if (!chapter) {
    return (
      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <Link href={backChaptersHref} className="text-sm font-semibold text-neutral-400 hover:text-[#1a3a78]">
          ← Back
        </Link>
        <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
          <p className="font-bold text-red-300">Chapter not found</p>
          <p className="mt-1 text-sm text-red-200/70">This chapter does not exist in this course scope.</p>
        </div>
      </section>
    );
  }

  async function handleSave() {
    if (!form.title.trim()) {
      setNotice({ kind: "error", text: "Enter a class title (e.g. Class 01)." });
      return;
    }
    if (!form.videoUrl.trim()) {
      setNotice({ kind: "error", text: "Add a Video/YouTube Link." });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...gate.headers },
        body: JSON.stringify({
          ...(editingId ? { id: editingId } : {}),
          chapterId: decodedChapterId,
          title: form.title.trim(),
          videoUrl: form.videoUrl.trim(),
          noteUrl: form.noteUrl.trim() || null,
          durationMinutes: Number(form.durationMinutes) || 0,
          isFree: form.isFree,
        }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setNotice({ kind: "error", text: data?.error ?? "Failed to save class." });
        return;
      }
      setForm({ title: "", videoUrl: "", noteUrl: "", durationMinutes: "0", isFree: false });
      setEditingId(null);
      setNotice({ kind: "success", text: editingId ? "Class updated." : "Class added." });
      await loadClasses();
    } finally {
      setBusy(false);
    }
  }

  function startEdit(item: CourseClass) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      videoUrl: item.videoUrl ?? "",
      noteUrl: item.noteUrl ?? "",
      durationMinutes: String(item.durationMinutes ?? 0),
      isFree: item.isFree,
    });
    setNotice(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id: string, title: string) {
    if (!window.confirm(`Delete "${title}"?`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/classes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...gate.headers },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setNotice({ kind: "error", text: data?.error ?? "Failed to delete." });
        return;
      }
      setNotice({ kind: "success", text: "Class removed." });
      await loadClasses();
    } finally {
      setBusy(false);
    }
  }

  async function handleReorder(index: number, dir: -1 | 1) {
    if (!classes) return;
    const target = index + dir;
    if (target < 0 || target >= classes.length) return;
    const next = [...classes];
    [next[index], next[target]] = [next[target], next[index]];
    setBusy(true);
    try {
      const res = await fetch("/api/admin/classes", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...gate.headers },
        body: JSON.stringify({ order: next.map((c) => c.id) }),
      });
      const data = (await res.json().catch(() => null)) as { classes?: CourseClass[] } | null;
      if (data?.classes) {
        const filtered = data.classes.filter((c) => c.chapterId === decodedChapterId);
        setClasses(filtered);
      } else {
        await loadClasses();
      }
    } finally {
      setBusy(false);
    }
  }

  const previewThumb = youtubeThumbnail(form.videoUrl);

  // Course Exam branch — reuse the same ExamManager but scoped to this chapter
  if (isExam) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <Link href={backChaptersHref} className="text-sm font-semibold text-slate-500 hover:text-[#1a3a78] admin-dark:text-slate-400">
          ← Back to Chapters
        </Link>
        <header className="mt-3">
          <p className="text-xs font-bold uppercase tracking-widest text-[#234e9f] admin-dark:text-[#93c5fd]">
            {decodedSlug.replace(/-/g, " ")} → {chapter.name}
          </p>
          <h1 className="mt-1 break-words text-2xl font-extrabold text-[#0b1e3a] admin-dark:text-white">
            {chapter.name} — Exams
          </h1>
          <p className="mt-1 text-sm text-slate-500 admin-dark:text-slate-400">
            Course → Exam → Chapter specific. Add/Edit/Delete/Publish exams, manage Questions, Rules and View Results per chapter (Course Exam Control).
          </p>
        </header>
        <div className="mt-6">
          <ExamManager
            title={`${chapter.name} — Chapter Exams`}
            description={`Exams attached to “${chapter.name}” (chapter ${decodedChapterId}). Publish to make them visible to enrolled students, manage Questions and Rules per exam, view Results.`}
            kindFilter="enrolled"
            allowEnrolled
            fixedChapter={{ id: decodedChapterId, name: chapter.name }}
          />
        </div>
        <p className="mt-6 rounded-xl border border-dashed border-[#bfdbfe] bg-[#f8fbff]/70 px-4 py-3 text-center text-xs leading-relaxed text-slate-500 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544]/60 admin-dark:text-slate-400">
          Hierarchy: {decodedSlug} → exam → {chapter.name} → Exams. Stored in <code className="rounded bg-white px-1 py-0.5 font-mono text-[11px] admin-dark:bg-[#0f2547]">exams</code> linked via <code className="rounded bg-white px-1 py-0.5 font-mono text-[11px] admin-dark:bg-[#0f2547]">chapter_id</code> → <code className="rounded bg-white px-1 py-0.5 font-mono text-[11px] admin-dark:bg-[#0f2547]">course_chapters</code>.
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <Link href={backChaptersHref} className="text-sm font-semibold text-slate-500 hover:text-[#1a3a78] admin-dark:text-slate-400">
        ← Back to Chapters
      </Link>

      <header className="mt-3">
        <p className="text-xs font-bold uppercase tracking-widest text-[#234e9f] admin-dark:text-[#93c5fd]">
          {decodedSlug.replace(/-/g, " ")} → {chapter.name}
        </p>
        <h1 className="mt-1 break-words text-2xl font-extrabold text-[#0b1e3a] admin-dark:text-white">
          {chapter.name} — Classes
        </h1>
        <p className="mt-1 text-sm text-slate-500 admin-dark:text-slate-400">
          Course → {ctype} → Chapter specific. Add multiple classes with YouTube link, thumbnail auto-fetched.
        </p>
      </header>

      {/* Add / Edit form */}
      <div className={`${cardClass} mt-6 p-4 sm:p-5`}>
        <h2 className="text-sm font-extrabold text-[#0b1e3a] admin-dark:text-white">
          {editingId ? "Edit Class" : "Add Class"}
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="cls-title">Class Title *</label>
            <input
              id="cls-title"
              placeholder="e.g. Class 01"
              className={inputClass}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="cls-video">Video / YouTube Link *</label>
            <input
              id="cls-video"
              placeholder="https://www.youtube.com/watch?v=..."
              className={inputClass}
              value={form.videoUrl}
              onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
            />
            {previewThumb ? (
              <div className="mt-2 overflow-hidden rounded-xl border border-[#dbeafe] bg-[#f8fbff] admin-dark:border-[#1e3a65] admin-dark:bg-[#0f2547]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewThumb} alt="YouTube thumbnail preview" className="aspect-video w-full object-cover" />
                <p className="px-3 py-1.5 text-[11px] font-semibold text-slate-500 admin-dark:text-slate-400">Thumbnail auto-fetched from YouTube</p>
              </div>
            ) : form.videoUrl.trim() ? (
              <p className="mt-1.5 text-xs text-amber-600 admin-dark:text-amber-400">Enter a valid YouTube link to preview thumbnail</p>
            ) : null}
          </div>
          <div>
            <label className={labelClass} htmlFor="cls-note">Note URL (optional PDF)</label>
            <input id="cls-note" className={inputClass} value={form.noteUrl} onChange={(e) => setForm({ ...form, noteUrl: e.target.value })} placeholder="https://..." />
          </div>
          <div>
            <label className={labelClass} htmlFor="cls-duration">Duration (minutes)</label>
            <input id="cls-duration" type="number" min="0" className={inputClass} value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} />
          </div>
          <div className="flex items-end gap-3 sm:col-span-2">
            <label className="flex items-center gap-2 pb-1 text-sm font-semibold text-slate-700 admin-dark:text-zinc-200">
              <input type="checkbox" className="h-4 w-4 accent-[#1a3a78]" checked={form.isFree} onChange={(e) => setForm({ ...form, isFree: e.target.checked })} />
              Free preview
            </label>
            <div className="ml-auto flex gap-2">
              {editingId && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setEditingId(null);
                    setForm({ title: "", videoUrl: "", noteUrl: "", durationMinutes: "0", isFree: false });
                    setNotice(null);
                  }}
                  className="rounded-xl border border-[#dbeafe] bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:border-[#93c5fd] admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] admin-dark:text-slate-300"
                >
                  Cancel
                </button>
              )}
              <button type="button" disabled={busy} onClick={() => void handleSave()} className={buttonPrimaryClass}>
                {editingId ? "Save Class" : "+ Add Class"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Class list with thumbnails */}
      <div className="mt-6">
        <h3 className="text-sm font-bold text-slate-700 admin-dark:text-slate-300">
          Classes in this chapter — {classes?.length ?? 0}
        </h3>
        {(classes ?? []).length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-[#dbeafe] bg-white px-4 py-8 text-center text-sm text-slate-500 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] admin-dark:text-slate-400">
            No classes yet. Add Class 01, Class 02 … above. They will appear as course → chapter specific cards with YouTube thumbnails.
          </p>
        ) : (
          <ul className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(classes ?? []).map((cls, idx) => {
              const thumb = youtubeThumbnail(cls.videoUrl);
              return (
                <li key={cls.id} className="flex flex-col overflow-hidden rounded-2xl border border-[#dbeafe] bg-white shadow-sm shadow-[#0b1e3a]/5 transition hover:border-[#93c5fd] hover:shadow-md admin-dark:border-[#1e3a65] admin-dark:bg-[#112544]">
                  <div className="relative aspect-video w-full overflow-hidden bg-[#f8fbff] admin-dark:bg-[#0f2547]">
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumb} alt={`${cls.title} thumbnail`} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm font-bold text-slate-400">No thumbnail</div>
                    )}
                    <span className="absolute left-2 top-2 rounded-full bg-[#0b1e3a]/85 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur">
                      Class {String(idx + 1).padStart(2, "0")}
                    </span>
                    {cls.isFree && <span className="absolute right-2 top-2 rounded-full bg-emerald-500 px-2.5 py-1 text-[11px] font-bold text-white">Free</span>}
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <h4 className="line-clamp-2 break-words text-sm font-extrabold text-[#0b1e3a] admin-dark:text-white">{cls.title}</h4>
                    {cls.videoUrl && (
                      <a
                        href={cls.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 break-all text-xs font-medium text-[#234e9f] hover:underline admin-dark:text-[#93c5fd]"
                      >
                        {cls.videoUrl}
                      </a>
                    )}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => startEdit(cls)}
                        className="rounded-lg border border-[#dbeafe] bg-[#f8fbff] px-3 py-1.5 text-xs font-bold text-[#1a3a78] hover:border-[#93c5fd] admin-dark:border-[#1e3a65] admin-dark:bg-[#0f2547] admin-dark:text-slate-300"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleDelete(cls.id, cls.title)}
                        className={buttonDangerClass + " h-auto w-auto px-3 py-1.5 text-xs"}
                      >
                        Delete
                      </button>
                      <span className="ml-auto flex gap-1">
                        <button
                          type="button"
                          disabled={busy || idx === 0}
                          onClick={() => void handleReorder(idx, -1)}
                          aria-label="Move up"
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#dbeafe] bg-white text-slate-600 hover:border-[#93c5fd] hover:text-[#1a3a78] disabled:opacity-30 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] admin-dark:text-slate-400"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          disabled={busy || idx === (classes?.length ?? 0) - 1}
                          onClick={() => void handleReorder(idx, 1)}
                          aria-label="Move down"
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#dbeafe] bg-white text-slate-600 hover:border-[#93c5fd] hover:text-[#1a3a78] disabled:opacity-30 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] admin-dark:text-slate-400"
                        >
                          ↓
                        </button>
                      </span>
                    </div>
                    {cls.videoUrl && (
                      <a
                        href={cls.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#1a3a78] px-4 py-2 text-xs font-bold text-white shadow hover:bg-[#123060] admin-dark:bg-[#234e9f] admin-dark:hover:bg-[#1a3a78]"
                      >
                        Open / View Class
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M14 5h7m0 0v7m0-7L10 16" /></svg>
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {notice && <p role="status" className={noticeClass(notice)}>{notice.text}</p>}

      <p className="mt-6 rounded-xl border border-dashed border-[#bfdbfe] bg-[#f8fbff]/70 px-4 py-3 text-center text-xs leading-relaxed text-slate-500 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544]/60 admin-dark:text-slate-400">
        Hierarchy: {decodedSlug} → {ctype} → {chapter.name} → Classes. Stored in <code className="rounded bg-white px-1 py-0.5 font-mono text-[11px] admin-dark:bg-[#0f2547]">course_classes</code> linked via <code className="rounded bg-white px-1 py-0.5 font-mono text-[11px] admin-dark:bg-[#0f2547]">chapter_id</code> → <code className="rounded bg-white px-1 py-0.5 font-mono text-[11px] admin-dark:bg-[#0f2547]">course_chapters</code> (course_slug, subject_id, paper_id).
      </p>
    </section>
  );
}
