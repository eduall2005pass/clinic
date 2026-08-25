"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { AccessLoading } from "@/components/auth/AccessGuard";

type Course = { slug: string; name: string; category?: string };

/** Level 2 — read-only course list of one category (managed in Course Control). */
export default function CategoryCoursesPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = use(params);
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [name, setName] = useState(category.replace(/-/g, " ").toUpperCase());

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/course-categories", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { categories?: Cat[] };
        const match = data.categories?.find((c) => c.id === category);
        if (match) setName(match.name.toUpperCase());
      }
      const courseRes = await fetch("/api/admin/courses", { cache: "no-store" });
      if (courseRes.ok) {
        const data = (await courseRes.json()) as { courses?: Course[] };
        const catName =
          data.courses?.find(
            (c) =>
              (c.category ?? "").toLowerCase().replace(/\s+/g, "-") ===
              category.toLowerCase(),
          )?.category ?? "";
        setCourses(
          (data.courses ?? []).filter(
            (c) =>
              !catName ||
              c.category === catName ||
              (c.category ?? "").toLowerCase().replace(/\s+/g, "-") ===
                category.toLowerCase(),
          ),
        );
      } else setCourses([]);
    })();
  }, [category]);

  type Cat = { id: string; name: string };

  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link
        href="/admin/course-content-control"
        className="text-sm font-semibold text-neutral-400 hover:text-primary-400"
      >
        ← Course Content Control
      </Link>
      <h1 className="mt-3 break-words text-2xl font-extrabold capitalize text-heading">
        {name}
      </h1>
      <p className="mt-1 text-sm text-neutral-400">
        Courses are synced from Course Control (read-only here).
      </p>
      {courses === null ? (
        <AccessLoading label="Loading courses…" />
      ) : courses.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-ink/15 px-4 py-8 text-center text-sm text-neutral-500">
          No courses in this category.
        </p>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {courses.map((course) => (
            <Link
              key={course.slug}
              href={`/admin/course-content-control/course/${encodeURIComponent(course.slug)}`}
              className="group flex min-h-[84px] items-center gap-3 rounded-2xl border border-ink/10 bg-dark-900 p-5 shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:border-primary-600/60"
            >
              <span aria-hidden className="text-xl">📘</span>
              <span className="flex-1 break-words font-extrabold text-heading group-hover:text-primary-400">
                {course.name}
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
