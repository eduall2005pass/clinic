"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AccessGate } from "@/components/auth/AccessGuard";

type FavExam = {
  item_id: string;
  title: string;
  duration_minutes: number;
  total_marks: number;
  chapter_name: string | null;
  subject_name: string | null;
  course_slug: string | null;
  course_name: string | null;
  created_at: string;
};

export default function FavouriteExamsView() {
  const { user, authLoading } = useAuth();
  const [items, setItems] = useState<FavExam[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/my/favourites/details?type=exam", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to load favourite exams");
      const data = (await res.json()) as { items?: FavExam[] };
      setItems(data.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) void load();
  }, [authLoading, user, load]);

  const toggle = async (itemId: string) => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/my/favourites", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ itemType: "exam", itemId }),
      });
      if (!res.ok) throw new Error("Failed");
      setItems((prev) => (prev ? prev.filter((i) => i.item_id !== itemId) : prev));
    } catch {
      // noop
    }
  };

  return (
    <AccessGate requirement="enrolled" loadingLabel="Loading favourite exams...">
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <Link href="/dashboard/favourites" className="inline-flex items-center gap-1 text-sm font-semibold text-neutral-400 transition hover:text-primary-400">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Favourite
        </Link>
        <header className="mt-4">
          <h1 className="text-2xl font-extrabold text-heading sm:text-3xl">Favourite Exams</h1>
          <p className="mt-1 text-sm text-neutral-400">Exams you marked as favourite — only yours.</p>
        </header>

        {loading || items === null ? (
          <div className="mt-8 flex flex-col items-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
            <p className="mt-3 text-sm font-semibold text-neutral-400">Loading favourite exams...</p>
          </div>
        ) : error ? (
          <div className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
            <p className="font-bold text-red-300">{error}</p>
            <button type="button" onClick={() => void load()} className="mt-4 rounded-xl bg-primary-600 px-6 py-2.5 text-sm font-bold text-white">Try Again</button>
          </div>
        ) : items.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-ink/15 bg-dark-900/60 p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/15 text-violet-400"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" /><path d="M9 5a2 2 0 002-2h2a2 2 0 002 2" /><path d="M9 5a2 2 0 002 2h2a2 2 0 002-2" /><path d="m9 14 2 2 4-4" /></svg></div>
            <p className="mt-4 font-semibold text-heading">No favourite exams yet</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-neutral-400">Tap the favourite icon on any exam inside your enrolled courses — it will appear here.</p>
            <Link href="/dashboard/enrolled-courses" className="mt-6 inline-block rounded-xl bg-primary-600 px-6 py-3 text-sm font-bold text-white hover:bg-primary-700">Browse Courses</Link>
          </div>
        ) : (
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {items.map((item) => (
              <li key={item.item_id} className="group rounded-2xl border border-ink/10 bg-dark-900 p-5 shadow-lg shadow-black/20 transition hover:border-violet-500/40">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-400"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" /><path d="M9 5a2 2 0 002-2h2a2 2 0 002 2" /></svg></span>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-bold text-heading group-hover:text-violet-400">{item.title}</h3>
                    <p className="mt-1 text-xs text-neutral-400">{[item.subject_name, item.chapter_name, item.course_name].filter(Boolean).join(" → ") || "Exam"}</p>
                    <p className="mt-1 text-[11px] font-semibold text-neutral-500">{item.duration_minutes} min · {item.total_marks} marks</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={`/exam/${encodeURIComponent(item.item_id)}/rules`} className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-700">
                    Open Exam
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" /></svg>
                  </Link>
                  <button type="button" onClick={() => void toggle(item.item_id)} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm font-bold text-amber-400 hover:bg-amber-500/20">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M11.48 3.5a.56.56 0 011.04 0l2.13 5.11 5.52.44c.5.04.7.66.32.98l-4.2 3.6 1.28 5.38a.56.56 0 01-.84.61L12 16.7l-4.73 2.92a.56.56 0 01-.84-.61l1.28-5.38-4.2-3.6a.56.56 0 01.32-.98l5.52-.44 2.13-5.11z" /></svg>
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AccessGate>
  );
}
