"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import type {
  StudentExamResultGroup,
  StudentExamResultRow,
} from "@/lib/my-exam-results";

type LoadState = "loading" | "error" | "ready";

type CourseOption = { slug: string; name: string };

type SortKey = "latest" | "oldest";

const ALL_COURSES = "__all__";

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function ordinal(position: number): string {
  const rem100 = position % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${position}th`;
  switch (position % 10) {
    case 1:
      return `${position}st`;
    case 2:
      return `${position}nd`;
    case 3:
      return `${position}rd`;
    default:
      return `${position}th`;
  }
}

function RankText({ position }: { position: number | null }) {
  if (position === null) return <span className="text-neutral-500">—</span>;
  const highlight =
    position === 1
      ? "text-yellow-300"
      : position <= 3
        ? "text-primary-300"
        : "text-neutral-300";
  return (
    <span className={`font-extrabold ${highlight}`}>{ordinal(position)}</span>
  );
}

function sortRows(
  rows: StudentExamResultRow[],
  query: string,
  sortKey: SortKey,
): StudentExamResultRow[] {
  const filtered = rows.filter((row) =>
    row.examName.toLowerCase().includes(query.trim().toLowerCase()),
  );
  return [...filtered].sort((a, b) => {
    const diff = a.submittedAt.localeCompare(b.submittedAt);
    return sortKey === "latest" ? -diff || b.submittedAt.localeCompare(a.submittedAt) : diff;
  });
}

function ResultTable({
  results,
  query,
  sortKey,
}: {
  results: StudentExamResultRow[];
  query: string;
  sortKey: SortKey;
}) {
  const rows = sortRows(results, query, sortKey);

  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-ink/15 bg-dark-950/60 p-6 text-center text-sm text-neutral-400">
        {query
          ? "No exams match your search."
          : "No exam results available for this course yet."}
      </p>
    );
  }

  return (
    <>
      {/* Tablet / desktop table */}
      <div className="hidden overflow-x-auto rounded-xl border border-ink/10 md:block">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-ink/10 bg-ink/5 text-[11px] font-bold uppercase tracking-wide text-neutral-500">
              <th className="px-4 py-3">Exam Name</th>
              <th className="px-3 py-3 text-center">Total Mark</th>
              <th className="px-3 py-3 text-center">Obtained Mark</th>
              <th className="px-3 py-3 text-center">Highest Mark</th>
              <th className="px-3 py-3 text-center">Ranking</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((result) => (
              <tr key={result.examId} className="border-b border-ink/5 last:border-0">
                <td className="px-4 py-3">
                  <span className="block font-semibold text-heading">
                    {result.examName}
                  </span>
                  <span className="text-[11px] text-neutral-500">
                    {formatDate(result.submittedAt)}
                  </span>
                </td>
                <td className="px-3 py-3 text-center font-semibold text-neutral-300">
                  {result.totalMarks}
                </td>
                <td className="px-3 py-3 text-center font-extrabold text-primary-400">
                  {result.obtainedMarks}
                </td>
                <td className="px-3 py-3 text-center font-semibold text-neutral-300">
                  {result.highestMark ?? "—"}
                </td>
                <td className="px-3 py-3 text-center">
                  <RankText position={result.meritPosition} />
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/dashboard/exam-result/${encodeURIComponent(result.examId)}`}
                    className="inline-block rounded-lg bg-primary-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-primary-900/40 transition hover:bg-primary-700 active:scale-[0.98]"
                  >
                    View Result
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards (all columns kept accessible) */}
      <ul className="space-y-2.5 md:hidden">
        {rows.map((result) => (
          <li
            key={result.examId}
            className="rounded-xl border border-ink/10 bg-dark-950/60 p-3.5"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-heading">
                  {result.examName}
                </p>
                <p className="text-[11px] text-neutral-500">
                  {formatDate(result.submittedAt)}
                </p>
              </div>
              <RankText position={result.meritPosition} />
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-ink/5 px-1 py-1.5">
                <dt className="text-[10px] font-semibold uppercase text-neutral-500">Total</dt>
                <dd className="text-sm font-bold text-neutral-300">{result.totalMarks}</dd>
              </div>
              <div className="rounded-lg bg-primary-600/10 px-1 py-1.5">
                <dt className="text-[10px] font-semibold uppercase text-neutral-500">Obtained</dt>
                <dd className="text-sm font-extrabold text-primary-400">{result.obtainedMarks}</dd>
              </div>
              <div className="rounded-lg bg-ink/5 px-1 py-1.5">
                <dt className="text-[10px] font-semibold uppercase text-neutral-500">Highest</dt>
                <dd className="text-sm font-bold text-neutral-300">{result.highestMark ?? "—"}</dd>
              </div>
            </dl>
            <Link
              href={`/dashboard/exam-result/${encodeURIComponent(result.examId)}`}
              className="mt-3 block rounded-lg bg-primary-600 py-2 text-center text-xs font-bold text-white transition hover:bg-primary-700 active:scale-[0.98]"
            >
              View Result →
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function ExamResultsView() {
  const { user, authLoading } = useAuth();
  const [groups, setGroups] = useState<StudentExamResultGroup[] | null>(null);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [selectedCourse, setSelectedCourse] = useState<string>(ALL_COURSES);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("latest");

  const load = useCallback(async () => {
    if (!user) return;
    setState("loading");
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/my/exam-results", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!response.ok) throw new Error("failed");
      const data = (await response.json()) as {
        groups?: StudentExamResultGroup[];
        courses?: CourseOption[];
      };
      setGroups(Array.isArray(data.groups) ? data.groups : []);
      // Selector shows ONLY the student's active enrollments.
      setCourses(Array.isArray(data.courses) ? data.courses : []);
      setState("ready");
    } catch {
      setState("error");
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user) void load();
  }, [authLoading, user, load]);

  const courseName = useMemo(
    () =>
      selectedCourse === ALL_COURSES
        ? null
        : courses.find((course) => course.slug === selectedCourse)?.name ?? null,
    [courses, selectedCourse],
  );

  const visibleGroups = useMemo(() => {
    const all = groups ?? [];
    if (selectedCourse === ALL_COURSES) return all;
    // Exams grouped by the course they belong to; a selected enrolled course
    // with no attempts still renders (with its empty-state message).
    const match = all.filter((group) => group.courseSlug === selectedCourse);
    return match.length > 0
      ? match
      : [
          {
            courseSlug: selectedCourse,
            courseName: courseName ?? selectedCourse,
            totalMarks: 0,
            obtainedMarks: 0,
            results: [],
          },
        ];
  }, [groups, selectedCourse, courseName]);

  if (state === "loading") {
    return (
      <section className="mx-auto flex max-w-6xl flex-col items-center px-4 py-24 sm:px-6">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        <p className="mt-4 text-sm font-semibold text-neutral-400">
          Loading your exam results...
        </p>
      </section>
    );
  }

  if (state === "error") {
    return (
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
          <p className="font-bold text-red-300">Something went wrong</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-6 rounded-xl bg-primary-600 px-6 py-3 font-semibold text-white shadow-lg shadow-primary-900/40 transition hover:bg-primary-700 active:scale-[0.98]"
          >
            Try Again
          </button>
        </div>
      </section>
    );
  }

  const selectClass =
    "w-full rounded-xl border border-ink/10 bg-dark-850 px-4 py-3 text-sm font-semibold text-heading transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30";

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm font-semibold text-neutral-400 transition hover:text-primary-400"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Dashboard
      </Link>

      <header className="mt-5">
        <p className="text-xs font-bold uppercase tracking-widest text-primary-500">
          Dashboard
        </p>
        <h1 className="mt-2 text-2xl font-extrabold text-heading sm:text-3xl">
          Exam Results
        </h1>
      </header>

      {/* Course selector + search + sorting */}
      <div className="mt-6 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-neutral-500">
            Course
          </span>
          <select
            aria-label="Select enrolled course"
            value={selectedCourse}
            onChange={(event) => setSelectedCourse(event.target.value)}
            className={selectClass}
          >
            <option value={ALL_COURSES}>All Enrolled Courses</option>
            {courses.map((course) => (
              <option key={course.slug} value={course.slug}>
                {course.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-neutral-500">
            Search Exam
          </span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by exam name…"
            className={selectClass}
          />
        </label>
        <label className="block md:w-44">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-neutral-500">
            Sort
          </span>
          <select
            aria-label="Sort results"
            value={sortKey}
            onChange={(event) => setSortKey(event.target.value as SortKey)}
            className={selectClass}
          >
            <option value="latest">Latest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </label>
      </div>

      {courses.length === 0 ? (
        /* Not enrolled in anything yet */
        <div className="mt-8 rounded-2xl border border-dashed border-ink/15 bg-dark-900/60 p-12 text-center">
          <p className="font-semibold text-heading">
            You are not enrolled in any course yet.
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-neutral-400">
            Enroll in a course and take exams — every result will appear here.
          </p>
          <Link
            href="/courses"
            className="mt-6 inline-block rounded-xl bg-primary-600 px-6 py-3 font-semibold text-white shadow-lg shadow-primary-900/40 transition hover:bg-primary-700 active:scale-[0.98]"
          >
            Explore Courses
          </Link>
        </div>
      ) : visibleGroups.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-ink/15 bg-dark-900/60 p-12 text-center">
          <p className="font-semibold text-heading">No exam results yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-neutral-400">
            You have not participated in any exam yet.
          </p>
          <Link
            href="/exam"
            className="mt-6 inline-block rounded-xl bg-primary-600 px-6 py-3 font-semibold text-white shadow-lg shadow-primary-900/40 transition hover:bg-primary-700 active:scale-[0.98]"
          >
            Browse Public Exams
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          {visibleGroups.map((group) => (
            <article
              key={group.courseSlug ?? "__general"}
              className="overflow-hidden rounded-2xl border border-ink/10 bg-dark-900 shadow-lg shadow-black/20"
            >
              {/* Course summary — overall totals for this course only */}
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 bg-ink/5 px-5 py-4">
                <h2 className="truncate text-base font-extrabold text-heading sm:text-lg">
                  {group.courseName}
                </h2>
                <div className="flex items-center gap-2">
                  <span className="rounded-lg border border-ink/10 bg-dark-850 px-3 py-1.5 text-center">
                    <span className="block text-[10px] font-bold uppercase tracking-wide text-neutral-500">
                      Total Mark
                    </span>
                    <span className="block text-sm font-extrabold text-heading">
                      {group.totalMarks}
                    </span>
                  </span>
                  <span className="rounded-lg border border-primary-500/30 bg-primary-600/10 px-3 py-1.5 text-center">
                    <span className="block text-[10px] font-bold uppercase tracking-wide text-primary-400/70">
                      Obtained Mark
                    </span>
                    <span className="block text-sm font-extrabold text-primary-400">
                      {group.obtainedMarks}
                    </span>
                  </span>
                </div>
              </header>

              <div className="p-4 sm:p-5">
                <ResultTable results={group.results} query={search} sortKey={sortKey} />
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
