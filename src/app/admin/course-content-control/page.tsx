"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AccessLoading } from "@/components/auth/AccessGuard";

type Course = { slug: string; name: string; category?: string };

// Flow 4: Course Content Control directly mirrors Course Control —
// every course created in Course Control automatically appears here.
export default function ContentControlPage() {
  const { user, authLoading } = useAuth();
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setError(false);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/courses", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("failed");
      const data = (await res.json()) as { courses?: Course[] };
      setCourses(Array.isArray(data.courses) ? data.courses : []);
    } catch {
      setError(true);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading || !user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [authLoading, user, load]);

  if (authLoading || courses === null)
    return <AccessLoading label="Loading Course Content Control…" />;

  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-extrabold text-heading">Course Content Control</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Manage all 4 flows. Existing Flows 1-3 remain unchanged. Flow 4 is <span className="font-bold text-primary-400">Course Content → Subject → Content</span> — courses are synced from Course Control automatically.
      </p>
      <p className="mt-1 text-xs text-neutral-500">
        Flow 4 Hierarchy: <span className="font-bold text-primary-400">Course Content → Subject → Content</span> · Flows 1-3 keep their own hierarchies (Direct / Paper / Subject → Class/Exam/Materials/Archive → Chapter → Content)
      </p>
      {error && (
        <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-6 text-center">
          <p className="text-sm text-red-400">Could not load courses.</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-3 rounded-xl bg-primary-600 px-4 py-2 text-xs font-bold text-white hover:bg-primary-700"
          >
            Try Again
          </button>
        </div>
      )}
      {!error && courses.length === 0 && (
        <p className="mt-6 rounded-xl border border-dashed border-ink/15 px-4 py-8 text-center text-sm text-neutral-500">
          No courses found. Create a course in Course Control — it will appear here automatically.
        </p>
      )}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {courses?.map((course) => (
          <Link
            key={course.slug}
            href={`/admin/course-content-control/course/${encodeURIComponent(course.slug)}`}
            className="group flex min-h-[84px] items-center gap-3 rounded-2xl border border-[#dbeafe] bg-white shadow-sm shadow-[#0b1e3a]/5 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] p-5 shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:border-primary-600/60"
          >
            <span aria-hidden className="text-xl">📘</span>
            <span className="flex-1 min-w-0">
              <span className="block break-words font-extrabold text-heading group-hover:text-[#1a3a78]">
                {course.name}
              </span>
              {course.category && <span className="text-xs text-neutral-500">{course.category}</span>}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
