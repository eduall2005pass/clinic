"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AccessGate } from "@/components/auth/AccessGuard";

type FavMaterial = {
  item_id: string;
  title: string;
  material_type: string;
  file_url: string;
  chapter_name: string;
  subject_name: string;
  course_slug: string;
  course_name: string;
  created_at: string;
};

export default function FavouriteMaterialsView() {
  const { user, authLoading } = useAuth();
  const [items, setItems] = useState<FavMaterial[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/my/favourites/details?type=material", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to load favourite materials");
      const data = (await res.json()) as { items?: FavMaterial[] };
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
        body: JSON.stringify({ itemType: "material", itemId }),
      });
      if (!res.ok) throw new Error("Failed");
      setItems((prev) => (prev ? prev.filter((i) => String(i.item_id) !== String(itemId)) : prev));
    } catch {
      // noop
    }
  };

  return (
    <AccessGate requirement="enrolled" loadingLabel="Loading favourite materials...">
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <Link href="/dashboard/favourites" className="inline-flex items-center gap-1 text-sm font-semibold text-neutral-400 transition hover:text-primary-400">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Favourite
        </Link>
        <header className="mt-4">
          <h1 className="text-2xl font-extrabold text-heading sm:text-3xl">Favourite Materials</h1>
          <p className="mt-1 text-sm text-neutral-400">PDFs and materials you saved — only yours.</p>
        </header>

        {loading || items === null ? (
          <div className="mt-8 flex flex-col items-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
            <p className="mt-3 text-sm font-semibold text-neutral-400">Loading favourite materials...</p>
          </div>
        ) : error ? (
          <div className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
            <p className="font-bold text-red-300">{error}</p>
            <button type="button" onClick={() => void load()} className="mt-4 rounded-xl bg-primary-600 px-6 py-2.5 text-sm font-bold text-white">Try Again</button>
          </div>
        ) : items.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-ink/15 bg-dark-900/60 p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6"><path d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg></div>
            <p className="mt-4 font-semibold text-heading">No favourite materials yet</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-neutral-400">Tap the favourite icon on any material/PDF inside your enrolled courses — it will appear here.</p>
            <Link href="/dashboard/enrolled-courses" className="mt-6 inline-block rounded-xl bg-primary-600 px-6 py-3 text-sm font-bold text-white hover:bg-primary-700">Browse Courses</Link>
          </div>
        ) : (
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {items.map((item) => (
              <li key={String(item.item_id)} className="group rounded-2xl border border-ink/10 bg-dark-900 p-5 shadow-lg shadow-black/20 transition hover:border-emerald-500/40">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="min-w-0 flex-1 truncate text-sm font-bold text-heading group-hover:text-emerald-400">{item.title}</h3>
                  <span className="inline-flex shrink-0 items-center rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-400">{item.material_type.toUpperCase()}</span>
                </div>
                <p className="mt-1.5 text-xs text-neutral-400">{[item.subject_name, item.chapter_name, item.course_name].filter(Boolean).join(" → ")}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <a href={item.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">
                    View PDF
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" /></svg>
                  </a>
                  <Link href={`/dashboard/enrolled-courses/${encodeURIComponent(item.course_slug)}/materials/${encodeURIComponent(String(item.item_id))}`} className="inline-flex items-center justify-center rounded-xl border border-ink/15 bg-ink/5 px-4 py-2.5 text-sm font-bold text-heading hover:border-primary-500/40">
                    Details
                  </Link>
                  <button type="button" onClick={() => void toggle(String(item.item_id))} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm font-bold text-amber-400 hover:bg-amber-500/20">
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
