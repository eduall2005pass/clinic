"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AccessLoading } from "@/components/auth/AccessGuard";
import { useAdminToast } from "@/components/admin/AdminToastProvider";

type Category = { id: string; name: string };
type Course = { slug: string; name: string; category?: string };
type Enrollment = {
  id: number | string;
  studentUid: string;
  studentName?: string;
  studentId?: string;
  email?: string;
  courseId: string;
  courseName: string;
  enrollmentStatus: string;
};

const STATUSES = ["pending", "active", "cancelled", "completed"] as const;

const statusStyles: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  cancelled: "bg-red-500/10 text-red-400 border-red-500/30",
  completed: "bg-blue-500/10 text-blue-400 border-blue-500/30",
};

export default function EnrollmentControlPage() {
  const toast = useAdminToast();
  const { user, authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [freeAutoEnroll, setFreeAutoEnroll] = useState<boolean | null>(null);
  const [savingToggle, setSavingToggle] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [courseSlug, setCourseSlug] = useState("");
  const [enrollments, setEnrollments] = useState<Enrollment[] | null>(null);
  const [listLoading, setListLoading] = useState(false);

  async function token(): Promise<string> {
    if (!user) throw new Error("Not signed in");
    return user.getIdToken();
  }

  // Load settings + categories + courses once.
  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    (async () => {
      try {
        const auth = { Authorization: `Bearer ${await token()}` };
        const [settingsRes, catRes, courseRes] = await Promise.all([
          fetch("/api/admin/enrollment-settings", { headers: auth, cache: "no-store" }),
          fetch("/api/course-categories", { cache: "no-store" }),
          fetch("/api/admin/courses", { cache: "no-store" }),
        ]);
        if (cancelled) return;
        if (settingsRes.ok) {
          const data = (await settingsRes.json()) as { freeAutoEnroll?: boolean };
          setFreeAutoEnroll(data.freeAutoEnroll !== false);
        }
        if (catRes.ok) {
          const data = (await catRes.json()) as { categories?: Category[] };
          setCategories(Array.isArray(data.categories) ? data.categories : []);
        }
        if (courseRes.ok) {
          const data = (await courseRes.json()) as { courses?: Course[] };
          setCourses(Array.isArray(data.courses) ? data.courses : []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  const paidCourses = useMemo(() => courses.filter((c) => c.slug), [courses]);

  const filteredCourses = useMemo(() => {
    if (!categoryId) return paidCourses;
    const cat = categories.find((c) => c.id === categoryId);
    return paidCourses.filter(
      (course) =>
        !cat ||
        course.category === cat.name ||
        (course.category ?? "").toLowerCase().replace(/\s+/g, "-") ===
          cat.id.toLowerCase(),
    );
  }, [paidCourses, categoryId, categories]);

  // Load the applicant list for the selected course.
  const loadList = useCallback(async () => {
    if (!courseSlug || !user) return;
    setListLoading(true);
    try {
      const res = await fetch(
        `/api/admin/enrollments?course=${encodeURIComponent(courseSlug)}`,
        {
          headers: { Authorization: `Bearer ${await user.getIdToken()}` },
          cache: "no-store",
        },
      );
      const data = (await res.json()) as { enrollments?: Enrollment[] };
      setEnrollments(Array.isArray(data.enrollments) ? data.enrollments : []);
    } catch {
      setEnrollments([]);
    } finally {
      setListLoading(false);
    }
  }, [courseSlug, user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnrollments(null);
    if (courseSlug) {
      void loadList();
    }
  }, [courseSlug, loadList]);

  async function updateStatus(enrollmentId: number | string, status: string) {
    try {
      const res = await fetch("/api/admin/enrollments", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await token()}`,
        },
        body: JSON.stringify({ id: Number(enrollmentId), status }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.showToast("error", data.error ?? "Failed to update the status.");
        return;
      }
      toast.showToast("success", `Application ${status}.`);
      void loadList();
    } catch {
      toast.showToast("error", "Failed to update the status.");
    }
  }

  async function toggleFreeAutoEnroll() {
    if (freeAutoEnroll === null || savingToggle) return;
    setSavingToggle(true);
    const next = !freeAutoEnroll;
    try {
      const res = await fetch("/api/admin/enrollment-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await token()}`,
        },
        body: JSON.stringify({ freeAutoEnroll: next }),
      });
      if (!res.ok) {
        toast.showToast("error", "Failed to save the setting.");
        return;
      }
      setFreeAutoEnroll(next);
      toast.showToast(
        "success",
        next
          ? "Free Course auto-enrollment is now ON."
          : "Free Course auto-enrollment is now OFF — free enrollments need approval.",
      );
    } finally {
      setSavingToggle(false);
    }
  }

  if (authLoading || loading) {
    return <AccessLoading label="Loading Enrollment Control…" />;
  }

  const selectedCourse = filteredCourses.find((c) => c.slug === courseSlug);

  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-extrabold text-heading">Enrollment Control</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Free Course auto-enrollment switch and the Paid Course application flow:
        Category → Course → Student List.
      </p>

      {/* Free Courses */}
      <div className="mt-8 rounded-2xl border border-ink/10 bg-dark-900 p-6 shadow-lg shadow-black/20">
        <h2 className="text-lg font-bold text-heading">Free Courses</h2>
        <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-ink/10 bg-dark-950/60 p-4">
          <div>
            <p className="font-semibold text-heading">Auto Enrollment</p>
            <p className="mt-0.5 text-xs text-neutral-400">
              ON → students get instant access to free courses. OFF → every free
              enrollment waits for your approval (status pending).
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={freeAutoEnroll === true}
            onClick={() => void toggleFreeAutoEnroll()}
            disabled={savingToggle || freeAutoEnroll === null}
            className={`relative inline-flex h-7 w-14 shrink-0 items-center rounded-full transition ${
              freeAutoEnroll ? "bg-emerald-500" : "bg-zinc-600"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                freeAutoEnroll ? "translate-x-8" : "translate-x-1"
              }`}
            />
          </button>
        </div>
        {freeAutoEnroll !== null && (
          <p className="mt-2 text-xs font-bold uppercase tracking-wide text-neutral-500">
            Current status:{" "}
            <span className={freeAutoEnroll ? "text-emerald-400" : "text-yellow-400"}>
              Auto Enrollment {freeAutoEnroll ? "ON" : "OFF"}
            </span>
          </p>
        )}
      </div>

      {/* Paid Courses flow */}
      <div className="mt-6 rounded-2xl border border-ink/10 bg-dark-900 p-6 shadow-lg shadow-black/20">
        <h2 className="text-lg font-bold text-heading">Paid Courses</h2>
        <p className="mt-1 text-xs text-neutral-500">
          Paid Courses → Category → Course → Student List
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

        {/* 3 · Student List */}
        {courseSlug && (
          <div className="mt-6">
            <h3 className="text-sm font-bold uppercase tracking-wide text-neutral-500">
              3 · Student List{selectedCourse ? ` — ${selectedCourse.name}` : ""}
            </h3>
            {listLoading ? (
              <p className="mt-4 text-sm text-neutral-400">Loading applicants…</p>
            ) : !enrollments || enrollments.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed border-ink/15 px-4 py-6 text-center text-sm text-neutral-500">
                No student has applied for this course yet.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {enrollments.map((enrollment) => (
                  <li
                    key={`${enrollment.studentUid}-${enrollment.courseId}`}
                    className="flex flex-wrap items-center gap-3 rounded-xl border border-ink/10 bg-dark-950/60 px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-heading">
                        {enrollment.studentName || enrollment.studentUid}
                      </p>
                      <p className="truncate text-[11px] text-neutral-500">
                        {[enrollment.studentId, enrollment.email]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-bold capitalize ${
                        statusStyles[enrollment.enrollmentStatus] ??
                        "border-ink/10 bg-ink/5 text-neutral-300"
                      }`}
                    >
                      {enrollment.enrollmentStatus}
                    </span>
                    <select
                      value={enrollment.enrollmentStatus}
                      onChange={(event) =>
                        void updateStatus(enrollment.id, event.target.value)
                      }
                      aria-label={`Change application status for ${enrollment.studentName || enrollment.studentUid}`}
                      className="rounded-lg border border-ink/15 bg-dark-850 px-2.5 py-1.5 text-xs font-semibold text-heading outline-none focus:border-primary-500/60"
                    >
                      {STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status[0].toUpperCase() + status.slice(1)}
                        </option>
                      ))}
                    </select>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
