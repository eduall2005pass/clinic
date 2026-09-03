"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import type { CourseLearningData } from "@/lib/my-learning";

function isPdf(url: string): boolean {
  return /\.pdf(\?|$)/i.test(url);
}

export default function MaterialPdfViewer({
  slug,
  materialId,
}: {
  slug: string;
  materialId: string;
}) {
  const { user, authLoading } = useAuth();
  const [state, setState] = useState<"loading" | "ready" | "error" | "notfound">("loading");
  const [material, setMaterial] = useState<{ title: string; fileUrl: string; questionCount: number } | null>(null);
  const [courseName, setCourseName] = useState<string>("");

  const load = useCallback(async () => {
    if (!user) return;
    setState("loading");
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/my/courses/${encodeURIComponent(slug)}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (res.status === 403) {
        setState("notfound");
        return;
      }
      if (!res.ok) throw new Error("failed");
      const data = (await res.json()) as { course?: CourseLearningData };
      const course = data.course;
      if (!course) {
        setState("notfound");
        return;
      }
      setCourseName(course.name);
      // Search all chapters across all subjects for the material
      let found: { title: string; fileUrl: string; questionCount: number } | null = null;
      for (const subj of course.subjects) {
        for (const ch of subj.chapters) {
          const m = ch.materials.find((x) => String(x.id) === String(materialId));
          if (m) {
            found = { title: m.title, fileUrl: m.fileUrl, questionCount: m.questionCount ?? 0 };
            break;
          }
        }
        if (found) break;
      }
      if (!found) {
        setState("notfound");
        return;
      }
      setMaterial(found);
      setState("ready");
      // Record view
      try {
        void fetch("/api/my/recent", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ itemType: "material", itemId: String(materialId) }),
        });
      } catch {}
    } catch {
      setState("error");
    }
  }, [user, slug, materialId]);

  useEffect(() => {
    if (authLoading) return;
    if (user) void load();
  }, [authLoading, user, load]);

  if (authLoading || state === "loading") {
    return (
      <section className="mx-auto flex max-w-5xl flex-col items-center px-4 py-24 sm:px-6">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        <p className="mt-4 text-sm font-semibold text-neutral-400">Loading material…</p>
      </section>
    );
  }

  if (state === "notfound") {
    return (
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <Link href={`/dashboard/enrolled-courses/${encodeURIComponent(slug)}`} className="inline-flex items-center gap-1 text-sm font-semibold text-neutral-400 hover:text-primary-400">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Back to course
        </Link>
        <div className="mt-8 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-8 text-center">
          <p className="font-bold text-yellow-300">Material not found</p>
          <p className="mt-1 text-sm text-yellow-200/70">This material is not available or you don&apos;t have access to this course.</p>
        </div>
      </section>
    );
  }

  if (state === "error" || !material) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
          <p className="font-bold text-red-300">Something went wrong</p>
          <button type="button" onClick={() => void load()} className="mt-4 rounded-xl bg-primary-600 px-6 py-3 font-semibold text-white">Try Again</button>
        </div>
      </section>
    );
  }

  const pdf = isPdf(material.fileUrl);

  return (
    <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <Link href={`/dashboard/enrolled-courses/${encodeURIComponent(slug)}`} className="inline-flex items-center gap-1 text-sm font-semibold text-neutral-400 transition hover:text-primary-400">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        {courseName || "Back to course"}
      </Link>

      <header className="mt-5">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-extrabold text-heading sm:text-2xl">{material.title}</h1>
          <span className="inline-flex items-center rounded-full bg-primary-600/15 px-3 py-1 text-xs font-bold text-primary-400">
            {material.questionCount} Questions
          </span>
        </div>
        <p className="mt-2 text-sm text-neutral-400">Read-only PDF · View in app · No editing tools</p>
      </header>

      <div className="mt-6 overflow-hidden rounded-2xl border border-ink/10 bg-dark-900 shadow-lg shadow-black/20">
        <div className="flex items-center justify-between border-b border-ink/10 bg-dark-950 px-4 py-3">
          <span className="text-xs font-bold uppercase tracking-wide text-neutral-400">PDF Viewer</span>
          <a href={material.fileUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-ink/15 bg-dark-900 px-3 py-1.5 text-xs font-bold text-heading transition hover:bg-ink/10">
            Open in new tab ↗
          </a>
        </div>
        <div className="bg-white">
          {pdf ? (
            <object data={material.fileUrl} type="application/pdf" className="h-[75vh] min-h-[420px] w-full">
              <iframe src={material.fileUrl} title={material.title} className="h-[75vh] min-h-[420px] w-full border-0" />
            </object>
          ) : (
            <div className="flex flex-col items-center justify-center p-10 text-center">
              <p className="text-sm font-semibold text-neutral-700">This material is not a PDF.</p>
              <a href={material.fileUrl} target="_blank" rel="noopener noreferrer" className="mt-4 rounded-xl bg-primary-600 px-6 py-3 text-sm font-bold text-white hover:bg-primary-700">Open File</a>
            </div>
          )}
        </div>
        {pdf && (
          <div className="border-t border-ink/10 bg-white px-3 py-2 text-center">
            <a href={material.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-primary-600 hover:text-primary-700">
              Can&apos;t see the PDF? Open in new tab →
            </a>
          </div>
        )}
      </div>
      <p className="mt-4 text-center text-xs text-neutral-500">Tip: Scroll and zoom in your browser to read clearly on mobile or desktop.</p>
    </section>
  );
}
