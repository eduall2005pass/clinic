"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AccessLoading } from "@/components/auth/AccessGuard";

type Cat = { id: string; name: string };

/** Level 1 — read-only category navigation (managed in Course Control). */
export default function ContentControlPage() {
  const { user, authLoading } = useAuth();
  const [categories, setCategories] = useState<Cat[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setError(false);
    try {
      const res = await fetch("/api/course-categories", { cache: "no-store" });
      if (!res.ok) throw new Error("failed");
      const data = (await res.json()) as { categories?: Cat[] };
      setCategories(Array.isArray(data.categories) ? data.categories : []);
    } catch {
      setError(true);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading || !user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [authLoading, user, load]);

  if (authLoading || categories === null)
    return <AccessLoading label="Loading Course Content Control…" />;

  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-extrabold text-heading">Course Content Control</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Categories are synced from Course Control (read-only here).
      </p>
      {error && (
        <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-6 text-center">
          <p className="text-sm text-red-400">Could not load categories.</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-3 rounded-xl bg-primary-600 px-4 py-2 text-xs font-bold text-white hover:bg-primary-700"
          >
            Try Again
          </button>
        </div>
      )}
      {!error && categories.length === 0 && (
        <p className="mt-6 rounded-xl border border-dashed border-ink/15 px-4 py-8 text-center text-sm text-neutral-500">
          No categories found.
        </p>
      )}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/admin/course-content-control/category/${encodeURIComponent(category.id)}`}
            className="group flex min-h-[84px] items-center gap-3 rounded-2xl border border-ink/10 bg-dark-900 p-5 shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:border-primary-600/60"
          >
            <span aria-hidden className="text-xl">📚</span>
            <span className="flex-1 break-words font-extrabold text-heading group-hover:text-primary-400">
              {category.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
