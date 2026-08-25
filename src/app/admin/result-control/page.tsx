"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AccessLoading } from "@/components/auth/AccessGuard";

type Category = { id: string; name: string };
type Course = { slug: string; name: string; category?: string };
type ExamSheet = {
  examId: string;
  title: string;
  totalMarks: number;
  highestMark: number;
  results: Array<{
    position: number;
    studentUid: string;
    studentName: string;
    obtained: number;
  }>;
};

export default function ResultControlPage() {
  const { user, authLoading } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [courseSlug, setCourseSlug] = useState("");
  const [sheets, setSheets] = useState<ExamSheet[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    (async () => {
      try {
        const [catRes, courseRes] = await Promise.all([
          fetch("/api/course-categories", { cache: "no-store" }),
          fetch("/api/admin/courses", { cache: "no-store" }),
        ]);
        if (cancelled) return;
        if (catRes.ok) {
          const data = (await catRes.json()) as { categories?: Category[] };
          setCategories(Array.isArray(data.categories) ? data.categories : []);
        }
        if (courseRes.ok) {
          const data = (await courseRes.json()) as { courses?: Course[] };
          setCourses(Array.isArray(data.courses) ? data.courses : []);
        }
      } catch {
        // lists stay empty
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  const filteredCourses = useMemo(() => {
    if (!categoryId) return courses;
    const cat = categories.find((c) => c.id === categoryId);
    return courses.filter(
      (course) =>
        !cat ||
        course.category === cat.name ||
        (course.category ?? "").toLowerCase().replace(/\s+/g, "-") ===
          cat.id.toLowerCase(),
    );
  }, [courses, categoryId, categories]);

  const loadSheet = useCallback(async () => {
    if (!courseSlug || !user) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/exams/course-results?slug=${encodeURIComponent(courseSlug)}`,
        {
          headers: { Authorization: `Bearer ${await user.getIdToken()}` },
          cache: "no-store",
        },
      );
      const data = (await res.json()) as { exams?: ExamSheet[] };
      setSheets(Array.isArray(data.exams) ? data.exams : []);
    } catch {
      setSheets([]);
    } finally {
      setLoading(false);
    }
  }, [courseSlug, user]);

  useEffect(() => {
    setSheets(null);
    if (courseSlug) {
      void loadSheet();
    }
  }, [courseSlug, loadSheet]);

  if (authLoading) {
    return <AccessLoading label="Loading Result Control…" />;
  }

  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-extrabold text-heading">Result Control</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Public Exam results and the Course Exam Result sheet.
      </p>

      {/* Public exam results */}
      <div className="mt-8 rounded-2xl border border-ink/10 bg-dark-900 p-6 shadow-lg shadow-black/20">
        <h2 className="text-lg font-bold text-heading">Public Exam Result</h2>
        <p className="mt-1 text-xs text-neutral-400">
          All submitted public exam results with scores and answer sheets.
        </p>
        <Link
          href="/admin/exams/results"
          className="mt-4 inline-block rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary-900/40 transition hover:bg-primary-700"
        >
          Open Public Exam Results
        </Link>
      </div>

      {/* Course exam result flow */}
      <div className="mt-6 rounded-2xl border border-ink/10 bg-dark-900 p-6 shadow-lg shadow-black/20">
        <h2 className="text-lg font-bold text-heading">Course Exam Result</h2>
        <p className="mt-1 text-xs text-neutral-500">
          Flow: Category → Course → Result Sheet
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              1 · Category
            </span>
            <select
              value={categoryId}
              onChange={(event) => {
                setCategoryId(event.target.value);
                setCourseSlug("");
              }}
              className="mt-1 w-full rounded-xl border border-ink/15 bg-dark-850 px-3 py-2.5 text-sm text-heading outline-none focus:border-primary-500/60"
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              2 · Course
            </span>
            <select
              value={courseSlug}
              onChange={(event) => setCourseSlug(event.target.value)}
              className="mt-1 w-full rounded-xl border border-ink/15 bg-dark-850 px-3 py-2.5 text-sm text-heading outline-none focus:border-primary-500/60"
            >
              <option value="">Select a course…</option>
              {filteredCourses.map((course) => (
                <option key={course.slug} value={course.slug}>
                  {course.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {courseSlug && loading && (
          <p className="mt-4 text-sm text-neutral-400">Loading result sheet…</p>
        )}

        {courseSlug && !loading && sheets !== null && sheets.length === 0 && (
          <p className="mt-4 rounded-xl border border-dashed border-ink/15 px-4 py-6 text-center text-sm text-neutral-500">
            No exams or results found for this course yet.
          </p>
        )}

        {sheets && sheets.length > 0 && (
          <div className="mt-6 space-y-6">
            {sheets.map((sheet) => (
              <div key={sheet.examId} className="overflow-x-auto">
                <h3 className="text-sm font-bold text-heading">{sheet.title}</h3>
                {sheet.results.length === 0 ? (
                  <p className="mt-2 text-xs text-neutral-500">No submissions yet.</p>
                ) : (
                  <table className="mt-2 w-full min-w-[560px] text-left text-xs">
                    <thead>
                      <tr className="border-b border-ink/10 text-neutral-500">
                        <th className="py-2 pr-3 font-semibold uppercase tracking-wide">Merit</th>
                        <th className="py-2 pr-3 font-semibold uppercase tracking-wide">Student</th>
                        <th className="py-2 pr-3 font-semibold uppercase tracking-wide">Exam Name</th>
                        <th className="py-2 pr-3 font-semibold uppercase tracking-wide">Total Mark</th>
                        <th className="py-2 pr-3 font-semibold uppercase tracking-wide">Obtained Mark</th>
                        <th className="py-2 font-semibold uppercase tracking-wide">Highest Mark</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sheet.results.map((result) => (
                        <tr
                          key={`${sheet.examId}-${result.studentUid}`}
                          className="border-b border-ink/5 text-neutral-300"
                        >
                          <td className="py-2 pr-3 font-bold text-primary-400">#{result.position}</td>
                          <td className="py-2 pr-3">{result.studentName}</td>
                          <td className="py-2 pr-3">{sheet.title}</td>
                          <td className="py-2 pr-3">{sheet.totalMarks}</td>
                          <td className="py-2 pr-3 font-bold text-heading">{result.obtained}</td>
                          <td className="py-2 font-bold text-emerald-400">{sheet.highestMark}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
