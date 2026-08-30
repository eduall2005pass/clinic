"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AccessLoading } from "@/components/auth/AccessGuard";
import {
  fetchCategoryOptions,
  fetchCoursesByCategory,
  type CatalogCourseLite,
} from "@/lib/category-courses-client";

type Category = { id: string; name: string };
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
  const [courses, setCourses] = useState<CatalogCourseLite[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [courseSlug, setCourseSlug] = useState("");
  const [sheets, setSheets] = useState<ExamSheet[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [coursesState, setCoursesState] = useState<
    "idle" | "loading" | "error" | "ready"
  >("idle");

  // Categories come from Course Control (single source of truth).
  useEffect(() => {
    if (authLoading || !user) return;
    void fetchCategoryOptions().then(setCategories);
  }, [authLoading, user]);

  // Backend-filtered: only the selected category's courses are returned.
  const loadCourses = useCallback(
    async (selectedId: string) => {
      if (!user || !selectedId) {
        setCourses([]);
        setCoursesState("idle");
        return;
      }
      setCoursesState("loading");
      const result = await fetchCoursesByCategory(await user.getIdToken(), selectedId);
      if (result.status === "ok") {
        setCourses(result.courses);
        setCoursesState("ready");
      } else if (result.status === "invalid-category") {
        setCourses([]);
        setCoursesState("ready");
      } else {
        setCoursesState("error");
      }
    },
    [user],
  );

  function selectCategory(nextId: string) {
    setCategoryId(nextId);
    setCourseSlug("");
    setSheets(null);
    void loadCourses(nextId);
  }

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
      <div className="mt-8 rounded-2xl border border-[#dbeafe] bg-white shadow-sm shadow-[#0b1e3a]/5 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] p-6 shadow-lg shadow-black/20">
        <h2 className="text-lg font-bold text-heading">Public Exam Result</h2>
        <p className="mt-1 text-xs text-neutral-400">
          All submitted public exam results with scores and answer sheets.
        </p>
        <Link
          href="/admin/result-control/public-exam"
          className="mt-4 inline-block rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary-900/40 transition hover:bg-primary-700"
        >
          Open Public Exam Results
        </Link>
      </div>

      {/* Course exam result flow */}
      <div className="mt-6 rounded-2xl border border-[#dbeafe] bg-white shadow-sm shadow-[#0b1e3a]/5 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] p-6 shadow-lg shadow-black/20">
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
              onChange={(event) => selectCategory(event.target.value)}
              className="mt-1 w-full rounded-xl border border-ink/15 bg-[#f8fbff] admin-dark:bg-[#0f2547] px-3 py-2.5 text-sm text-heading outline-none focus:border-[#2f6bce]/60"
            >
              <option value="">Select a category…</option>
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
            {coursesState === "loading" ? (
              <p className="mt-1 text-sm text-neutral-400">Loading courses…</p>
            ) : coursesState === "error" ? (
              <div className="mt-1 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5">
                <p className="text-sm text-red-400">Could not load courses.</p>
                <button
                  type="button"
                  onClick={() => void loadCourses(categoryId)}
                  className="mt-2 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-primary-700"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <select
                value={courseSlug}
                onChange={(event) => setCourseSlug(event.target.value)}
                disabled={!categoryId || courses.length === 0}
                className="mt-1 w-full rounded-xl border border-ink/15 bg-[#f8fbff] admin-dark:bg-[#0f2547] px-3 py-2.5 text-sm text-heading outline-none focus:border-[#2f6bce]/60 disabled:opacity-50"
              >
                <option value="">
                  {categoryId ? "Select a course…" : "Select a category first…"}
                </option>
                {courses.map((course) => (
                  <option key={course.slug} value={course.slug}>
                    {course.name}
                  </option>
                ))}
              </select>
            )}
            {categoryId && coursesState === "ready" && courses.length === 0 && (
              <p className="mt-2 text-xs text-neutral-500">
                No courses found in this category.
              </p>
            )}
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
