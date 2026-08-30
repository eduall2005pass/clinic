"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AccessLoading } from "@/components/auth/AccessGuard";

type Cat = { id: string; name: string };
type Course = { slug: string; name: string; category?: string };

/**
 * Level 2 — courses of ONE category. The category ID is passed to the API
 * and filtering happens in the backend query (no cross-category leakage).
 */
export default function CategoryCoursesPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = use(params);
  const { user, authLoading } = useAuth();
  const [state, setState] = useState<
    "loading" | "invalid" | "error" | "ready"
  >("loading");
  const [name, setName] = useState(category);
  const [courses, setCourses] = useState<Course[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    setState("loading");
    try {
      // Resolve the category ID → valid category? (invalid → error state)
      const catRes = await fetch("/api/course-categories", { cache: "no-store" });
      const catData = catRes.ok
        ? ((await catRes.json()) as { categories?: Cat[] })
        : { categories: [] };
      const match = (catData.categories ?? []).find((c) => c.id === category);
      if (!match) {
        setState("invalid");
        return;
      }
      setName(match.name);

      // Backend returns ONLY this category's courses.
      const courseRes = await fetch(
        `/api/admin/courses?categoryId=${encodeURIComponent(category)}`,
        {
          cache: "no-store",
          headers: { Authorization: `Bearer ${await user.getIdToken()}` },
        },
      );
      if (!courseRes.ok) throw new Error("failed");
      const data = (await courseRes.json()) as { courses?: Course[] };
      setCourses(Array.isArray(data.courses) ? data.courses : []);
      setState("ready");
    } catch {
      setState("error");
    }
  }, [category, user]);

  useEffect(() => {
    if (authLoading || !user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [authLoading, user, load]);

  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link
        href="/admin/course-content-control"
        className="text-sm font-semibold text-neutral-400 hover:text-[#1a3a78]"
      >
        ← Course Content Control
      </Link>
      {state === "loading" && <AccessLoading label="Loading courses…" />}

      {state === "invalid" && (
        <div className="mt-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-6 text-center">
          <p className="text-sm font-bold text-yellow-300">
            Invalid category / Category not found
          </p>
          <Link
            href="/admin/course-content-control"
            className="mt-3 inline-block rounded-xl bg-primary-600 px-4 py-2 text-xs font-bold text-white hover:bg-primary-700"
          >
            Back
          </Link>
        </div>
      )}

      {state === "error" && (
        <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-6 text-center">
          <p className="text-sm text-red-400">Failed to load courses.</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-3 rounded-xl bg-primary-600 px-4 py-2 text-xs font-bold text-white hover:bg-primary-700"
          >
            Try Again
          </button>
        </div>
      )}

      {state === "ready" && (
        <>
          <h1 className="mt-3 break-words text-2xl font-extrabold uppercase text-heading">
            {name}
          </h1>
          <p className="mt-1 text-sm text-neutral-400">
            Courses synced from Course Control — only this category&apos;s
            courses are shown.
          </p>
          {courses.length === 0 ? (
            <p className="mt-6 rounded-xl border border-dashed border-ink/15 px-4 py-8 text-center text-sm text-neutral-500">
              No courses found in this category.
            </p>
          ) : (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {courses.map((course) => (
                <Link
                  key={course.slug}
                  href={`/admin/course-content-control/course/${encodeURIComponent(course.slug)}`}
                  className="group flex min-h-[84px] items-center gap-3 rounded-2xl border border-[#dbeafe] bg-white shadow-sm shadow-[#0b1e3a]/5 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] p-5 shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:border-primary-600/60"
                >
                  <span aria-hidden className="text-xl">📘</span>
                  <span className="flex-1 break-words font-extrabold text-heading group-hover:text-[#1a3a78]">
                    {course.name}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
