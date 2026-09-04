"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import PermissionGate from "@/components/auth/PermissionGate";

type Subject = { id: string; name: string; sortOrder: number; chapters: Array<{ id: string; name: string; sortOrder: number; contents: Array<{ id: string; title: string; contentType: string; videoUrl: string | null; fileUrl: string | null; durationMinutes: number }> }> };

type DirectSubject = { id: string; name: string; sortOrder: number; contents: Array<{ id: string; title: string; contentType: string; videoUrl: string | null; fileUrl: string | null; durationMinutes: number }> };

function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-sm font-semibold text-neutral-400 transition hover:text-primary-400">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
      {label}
    </Link>
  );
}

function useFlow4(slug: string) {
  const { user, authLoading } = useAuth();
  const [subjects, setSubjects] = useState<Subject[] | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  const load = useCallback(async () => {
    if (!user) return;
    setState("loading");
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/my/flow4?course=${encodeURIComponent(slug)}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      if (!res.ok) throw new Error("failed");
      const data = (await res.json()) as { subjects?: Subject[] };
      setSubjects(Array.isArray(data.subjects) ? data.subjects : []);
      setState("ready");
    } catch {
      setState("error");
    }
  }, [user, slug]);

  useEffect(() => {
    if (authLoading || !user) return;
    void load();
  }, [authLoading, user, load]);

  return { subjects, state, load, authLoading, user };
}

function useFlow4Direct(slug: string) {
  const { user, authLoading } = useAuth();
  const [subjects, setSubjects] = useState<DirectSubject[] | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  const load = useCallback(async () => {
    if (!user) return;
    setState("loading");
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/my/flow4?course=${encodeURIComponent(slug)}&direct=1`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      if (!res.ok) throw new Error("failed");
      const data = (await res.json()) as { subjects?: DirectSubject[] };
      setSubjects(Array.isArray(data.subjects) ? data.subjects : []);
      setState("ready");
    } catch {
      setState("error");
    }
  }, [user, slug]);

  useEffect(() => {
    if (authLoading || !user) return;
    void load();
  }, [authLoading, user, load]);

  return { subjects, state, load, authLoading, user };
}

// ── Course → Subjects ──
export function Flow4CourseView({ slug }: { slug: string }) {
  return (
    <PermissionGate requirement="course" courseSlug={slug} loadingLabel="Loading course...">
      <Flow4CourseContent slug={slug} />
    </PermissionGate>
  );
}

function Flow4CourseContent({ slug }: { slug: string }) {
  const { subjects, state, load } = useFlow4(slug);
  if (state === "loading" || subjects === null) {
    return (
      <section className="mx-auto flex max-w-6xl flex-col items-center px-4 py-24 sm:px-6">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        <p className="mt-4 text-sm font-semibold text-neutral-400">Loading course content…</p>
      </section>
    );
  }
  if (state === "error") {
    return (
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
          <p className="font-bold text-red-300">Something went wrong</p>
          <button type="button" onClick={() => void load()} className="mt-4 rounded-xl bg-primary-600 px-6 py-3 font-semibold text-white">Try Again</button>
        </div>
      </section>
    );
  }
  // Navigation must remain even if no subjects → show No Content Available
  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <BackLink href="/dashboard/enrolled-courses" label="My Enrolled Courses" />
      <header className="mt-5">
        <p className="text-xs font-bold uppercase tracking-widest text-primary-500">Course Content</p>
        <h1 className="mt-2 text-2xl font-extrabold text-heading sm:text-3xl">Subjects</h1>
        <p className="mt-1 text-sm text-neutral-400">Select a subject to open its chapters.</p>
      </header>
      {subjects.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-ink/15 bg-dark-900/60 p-10 text-center">
          <p className="font-semibold text-heading">No Content Available</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-neutral-400">This course has no subjects published yet. Please check back later.</p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {subjects.map((sub) => (
            <li key={sub.id}>
              <Link href={`/dashboard/enrolled-courses/${encodeURIComponent(slug)}/subjects/${encodeURIComponent(sub.id)}`} className="group flex items-center gap-4 rounded-2xl border border-ink/10 bg-dark-900 p-4 shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-0.5 hover:border-primary-600/60 hover:shadow-primary-900/30 sm:p-5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-600/15 text-primary-400 group-hover:bg-primary-600 group-hover:text-white">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-extrabold text-heading group-hover:text-primary-400">{sub.name}</span>
                  <span className="text-xs text-neutral-500">{sub.chapters.length} chapter{sub.chapters.length === 1 ? "" : "s"}</span>
                </span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-4 w-4 shrink-0 text-neutral-500 group-hover:translate-x-1 group-hover:text-primary-400"><path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" /></svg>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ── Subject → Chapters ──
export function Flow4SubjectView({ slug, subjectId }: { slug: string; subjectId: string }) {
  return (
    <PermissionGate requirement="course" courseSlug={slug} loadingLabel="Loading course...">
      <Flow4SubjectContent slug={slug} subjectId={subjectId} />
    </PermissionGate>
  );
}

function Flow4SubjectContent({ slug, subjectId }: { slug: string; subjectId: string }) {
  const { subjects, state, load } = useFlow4(slug);
  if (state === "loading" || subjects === null) {
    return (
      <section className="mx-auto flex max-w-6xl flex-col items-center px-4 py-24 sm:px-6">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        <p className="mt-4 text-sm font-semibold text-neutral-400">Loading chapters…</p>
      </section>
    );
  }
  if (state === "error") {
    return (
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
          <p className="font-bold text-red-300">Something went wrong</p>
          <button type="button" onClick={() => void load()} className="mt-4 rounded-xl bg-primary-600 px-6 py-3 font-semibold text-white">Try Again</button>
        </div>
      </section>
    );
  }
  const subject = subjects.find((s) => s.id === subjectId);
  if (!subject) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-8 text-center">
          <p className="font-bold text-yellow-300">Subject not found</p>
          <BackLink href={`/dashboard/enrolled-courses/${encodeURIComponent(slug)}`} label="Back to Course" />
        </div>
      </section>
    );
  }
  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <BackLink href={`/dashboard/enrolled-courses/${encodeURIComponent(slug)}`} label="Course Content" />
      <header className="mt-5">
        <p className="text-xs font-bold uppercase tracking-widest text-primary-500">{subject.name}</p>
        <h1 className="mt-2 text-2xl font-extrabold text-heading sm:text-3xl">Chapters</h1>
        <p className="mt-1 text-sm text-neutral-400">Select a chapter to open its contents.</p>
      </header>
      {subject.chapters.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-ink/15 bg-dark-900/60 p-10 text-center">
          <p className="font-semibold text-heading">No Content Available</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-neutral-400">This subject has no chapters yet.</p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {subject.chapters.map((ch, idx) => (
            <li key={ch.id}>
              <Link href={`/dashboard/enrolled-courses/${encodeURIComponent(slug)}/subjects/${encodeURIComponent(subjectId)}/chapters/${encodeURIComponent(ch.id)}`} className="group flex h-full min-h-[110px] flex-col justify-between rounded-2xl border border-ink/10 bg-dark-900 p-5 shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-primary-600/60 hover:shadow-primary-900/30">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-600/15 text-sm font-black text-primary-400 group-hover:bg-primary-600 group-hover:text-white">{String(idx + 1).padStart(2, "0")}</span>
                  <span className="rounded-full border border-ink/10 bg-dark-850 px-2.5 py-1 text-[11px] font-bold text-neutral-400">{ch.contents.length} content</span>
                </div>
                <div className="mt-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-primary-400">Chapter {String(idx + 1).padStart(2, "0")}</p>
                  <p className="mt-1 line-clamp-2 break-words text-sm font-extrabold leading-snug text-heading group-hover:text-primary-400">{ch.name}</p>
                </div>
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-neutral-500 group-hover:text-primary-400">Open →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ── Chapter → Contents ──
export function Flow4ChapterView({ slug, subjectId, chapterId }: { slug: string; subjectId: string; chapterId: string }) {
  return (
    <PermissionGate requirement="course" courseSlug={slug} loadingLabel="Loading course...">
      <Flow4ChapterContent slug={slug} subjectId={subjectId} chapterId={chapterId} />
    </PermissionGate>
  );
}

function Flow4ChapterContent({ slug, subjectId, chapterId }: { slug: string; subjectId: string; chapterId: string }) {
  const { subjects, state, load } = useFlow4(slug);
  if (state === "loading" || subjects === null) {
    return (
      <section className="mx-auto flex max-w-6xl flex-col items-center px-4 py-24 sm:px-6">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        <p className="mt-4 text-sm font-semibold text-neutral-400">Loading content…</p>
      </section>
    );
  }
  if (state === "error") {
    return (
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
          <p className="font-bold text-red-300">Something went wrong</p>
          <button type="button" onClick={() => void load()} className="mt-4 rounded-xl bg-primary-600 px-6 py-3 font-semibold text-white">Try Again</button>
        </div>
      </section>
    );
  }
  const subject = subjects.find((s) => s.id === subjectId);
  const chapter = subject?.chapters.find((c) => c.id === chapterId);
  if (!subject || !chapter) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-8 text-center">
          <p className="font-bold text-yellow-300">Chapter not found</p>
          <BackLink href={`/dashboard/enrolled-courses/${encodeURIComponent(slug)}/subjects/${encodeURIComponent(subjectId)}`} label="Back to Chapters" />
        </div>
      </section>
    );
  }
  const iconFor = (ct: string) => {
    const t = ct.toLowerCase();
    if (t === "exam") return "📝";
    if (t === "pdf" || t === "note") return "📄";
    if (t === "slide") return "📑";
    if (t === "link") return "🔗";
    return "🎥";
  };
  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <BackLink href={`/dashboard/enrolled-courses/${encodeURIComponent(slug)}/subjects/${encodeURIComponent(subjectId)}`} label={subject.name} />
      <header className="mt-5">
        <p className="text-xs font-bold uppercase tracking-widest text-primary-500">{chapter.name}</p>
        <h1 className="mt-2 text-2xl font-extrabold text-heading sm:text-3xl">Contents</h1>
        <p className="mt-1 text-sm text-neutral-400">All available learning content inside this chapter.</p>
      </header>
      {chapter.contents.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-ink/15 bg-dark-900/60 p-10 text-center">
          <p className="font-semibold text-heading">No Content Available</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-neutral-400">This chapter has no content yet. Please check back later.</p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {chapter.contents.map((ct, idx) => (
            <li key={ct.id} className="flex items-center gap-4 rounded-2xl border border-ink/10 bg-dark-900 p-4 shadow-lg shadow-black/20 transition hover:border-primary-600/60">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-600/15 text-lg">{iconFor(ct.contentType)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-heading">{idx + 1}. {ct.title}</span>
                <span className="text-xs text-neutral-500">{ct.contentType} {ct.durationMinutes > 0 ? `· ${ct.durationMinutes} min` : ""}</span>
                {(ct.videoUrl || ct.fileUrl) && (
                  <span className="block truncate text-xs text-primary-400">{ct.videoUrl ?? ct.fileUrl}</span>
                )}
              </span>
              {ct.videoUrl ? (
                <a href={ct.videoUrl} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-primary-600 px-4 py-2 text-xs font-bold text-white hover:bg-primary-700">Watch</a>
              ) : ct.fileUrl ? (
                <a href={ct.fileUrl} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700">Open</a>
              ) : (
                <span className="rounded-xl border border-ink/10 px-4 py-2 text-xs font-bold text-neutral-400">{ct.contentType}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ── NEW Flow 4 Direct: Course Content → Subject → Content ──
// Per spec: Course Content → Subject → Content (no Chapter)

// Course → Subjects (direct)
export function Flow4DirectCourseView({ slug }: { slug: string }) {
  return (
    <PermissionGate requirement="course" courseSlug={slug} loadingLabel="Loading course...">
      <Flow4DirectCourseContent slug={slug} />
    </PermissionGate>
  );
}

function Flow4DirectCourseContent({ slug }: { slug: string }) {
  const { subjects, state, load } = useFlow4Direct(slug);
  if (state === "loading" || subjects === null) {
    return (
      <section className="mx-auto flex max-w-6xl flex-col items-center px-4 py-24 sm:px-6">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        <p className="mt-4 text-sm font-semibold text-neutral-400">Loading course content…</p>
      </section>
    );
  }
  if (state === "error") {
    return (
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
          <p className="font-bold text-red-300">Something went wrong</p>
          <button type="button" onClick={() => void load()} className="mt-4 rounded-xl bg-primary-600 px-6 py-3 font-semibold text-white">Try Again</button>
        </div>
      </section>
    );
  }
  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <BackLink href="/dashboard/enrolled-courses" label="My Enrolled Courses" />
      <header className="mt-5">
        <p className="text-xs font-bold uppercase tracking-widest text-primary-500">Course Content</p>
        <h1 className="mt-2 text-2xl font-extrabold text-heading sm:text-3xl">Subjects</h1>
        <p className="mt-1 text-sm text-neutral-400">Select a subject to open its contents.</p>
      </header>
      {subjects.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-ink/15 bg-dark-900/60 p-10 text-center">
          <p className="font-semibold text-heading">No Content Available</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-neutral-400">This course has no subjects published yet. Please check back later.</p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {subjects.map((sub) => (
            <li key={sub.id}>
              <Link href={`/dashboard/enrolled-courses/${encodeURIComponent(slug)}/subjects/${encodeURIComponent(sub.id)}`} className="group flex items-center gap-4 rounded-2xl border border-ink/10 bg-dark-900 p-4 shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-0.5 hover:border-primary-600/60 hover:shadow-primary-900/30 sm:p-5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-600/15 text-primary-400 group-hover:bg-primary-600 group-hover:text-white">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-extrabold text-heading group-hover:text-primary-400">{sub.name}</span>
                  <span className="text-xs text-neutral-500">{sub.contents.length} content{sub.contents.length === 1 ? "" : "s"}</span>
                </span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-4 w-4 shrink-0 text-neutral-500 group-hover:translate-x-1 group-hover:text-primary-400"><path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" /></svg>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// Subject → Contents (direct, no chapter)
export function Flow4DirectSubjectView({ slug, subjectId }: { slug: string; subjectId: string }) {
  return (
    <PermissionGate requirement="course" courseSlug={slug} loadingLabel="Loading course...">
      <Flow4DirectSubjectContent slug={slug} subjectId={subjectId} />
    </PermissionGate>
  );
}

function Flow4DirectSubjectContent({ slug, subjectId }: { slug: string; subjectId: string }) {
  const { subjects, state, load } = useFlow4Direct(slug);
  if (state === "loading" || subjects === null) {
    return (
      <section className="mx-auto flex max-w-6xl flex-col items-center px-4 py-24 sm:px-6">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        <p className="mt-4 text-sm font-semibold text-neutral-400">Loading content…</p>
      </section>
    );
  }
  if (state === "error") {
    return (
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
          <p className="font-bold text-red-300">Something went wrong</p>
          <button type="button" onClick={() => void load()} className="mt-4 rounded-xl bg-primary-600 px-6 py-3 font-semibold text-white">Try Again</button>
        </div>
      </section>
    );
  }
  const subject = subjects.find((s) => s.id === subjectId);
  if (!subject) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-8 text-center">
          <p className="font-bold text-yellow-300">Subject not found</p>
          <BackLink href={`/dashboard/enrolled-courses/${encodeURIComponent(slug)}`} label="Back to Course" />
        </div>
      </section>
    );
  }
  const iconFor = (ct: string) => {
    const t = ct.toLowerCase();
    if (t === "exam" || t === "quiz") return "📝";
    if (t === "pdf" || t === "note") return "📄";
    if (t === "slide") return "📑";
    if (t === "link") return "🔗";
    if (t === "image") return "🖼️";
    if (t === "audio") return "🎧";
    if (t === "video" || t === "class") return "🎥";
    return "📁";
  };
  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <BackLink href={`/dashboard/enrolled-courses/${encodeURIComponent(slug)}`} label="Course Content" />
      <header className="mt-5">
        <p className="text-xs font-bold uppercase tracking-widest text-primary-500">{subject.name}</p>
        <h1 className="mt-2 text-2xl font-extrabold text-heading sm:text-3xl">Contents</h1>
        <p className="mt-1 text-sm text-neutral-400">All available learning content inside this subject.</p>
      </header>
      {subject.contents.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-ink/15 bg-dark-900/60 p-10 text-center">
          <p className="font-semibold text-heading">No Content Available</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-neutral-400">This subject has no content yet. Please check back later.</p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {subject.contents.map((ct, idx) => (
            <li key={ct.id} className="flex items-center gap-4 rounded-2xl border border-ink/10 bg-dark-900 p-4 shadow-lg shadow-black/20 transition hover:border-primary-600/60">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-600/15 text-lg">{iconFor(ct.contentType)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-heading">{idx + 1}. {ct.title}</span>
                <span className="text-xs text-neutral-500">{ct.contentType} {ct.durationMinutes > 0 ? `· ${ct.durationMinutes} min` : ""}</span>
                {(ct.videoUrl || ct.fileUrl) && (
                  <span className="block truncate text-xs text-primary-400">{ct.videoUrl ?? ct.fileUrl}</span>
                )}
              </span>
              {ct.videoUrl ? (
                <a href={ct.videoUrl} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-primary-600 px-4 py-2 text-xs font-bold text-white hover:bg-primary-700">Watch</a>
              ) : ct.fileUrl ? (
                <a href={ct.fileUrl} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700">Open</a>
              ) : ct.contentType === "quiz" || ct.contentType === "exam" ? (
                <Link href={`/exam/${encodeURIComponent(ct.id)}/rules`} className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white hover:bg-violet-700">Start</Link>
              ) : (
                <span className="rounded-xl border border-ink/10 px-4 py-2 text-xs font-bold text-neutral-400">{ct.contentType}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
