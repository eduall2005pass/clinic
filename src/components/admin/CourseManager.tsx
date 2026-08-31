"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AccessLoading, AccessMessage } from "@/components/auth/AccessGuard";
import {
  useAdminGate,
  noticeClass,
  cardClass,
  inputClass,
  labelClass,
  buttonPrimaryClass,
  buttonSecondaryClass,
  buttonDangerClass,
  type Notice,
} from "@/components/admin/admin-ui";
import { MediaUploadField } from "@/components/admin/MediaUploadField";
import {
  type CatalogCourseCategory,
  type CourseContentLayout,
  type CourseDetails,
} from "@/lib/courses-admin";

export type CatalogCourse = {
  slug: string;
  name: string;
  category: CatalogCourseCategory;
  batchId: string;
  image: string | null;
  shortDescription: string | null;
  description: string | null;
  teacherPhoto: string | null;
  duration: string;
  fee: number;
  discountFee: number | null;
  features: string[];
  overviewTitle: string;
  overview: string[];
  status: "published" | "unpublished";
  availability: "available" | "hidden";
  couponEnabled: boolean;
  featured: boolean;
  contentLayout: CourseContentLayout;
  totalClasses?: number;
  totalExams?: number;
  courseDetails?: CourseDetails;
};

const EMPTY_FORM = {
  slug: "",
  name: "",
  category: "HSC Academic" as CatalogCourseCategory,
  batchId: "hsc-28",
  image: "",
  shortDescription: "",
  description: "",
  duration: "",
  fee: "0",
  discountFee: "",
  overviewTitle: "Chapters",
  status: "unpublished" as "published" | "unpublished",
  couponEnabled: false,
  featured: false,
  contentLayout: "flow-1" as "flow-1" | "flow-2" | "flow-3",
  totalClasses: "",
  totalExams: "",
  courseDuration: "",
  courseDescription: "",
  courseTopics: "",
  chapterOverview: "",
  teachersJson: "[]",
};

type FormState = typeof EMPTY_FORM;

/** Sensible default batch id per course category for the pre-filled form. */
function defaultBatchFor(category: CatalogCourseCategory): string {
  switch (category) {
    case "SSC Academic":
      return "ssc-29";
    case "Medical Admission":
    case "Varsity Admission":
    case "HSC Academic":
      return "hsc-29";
    default:
      return "hsc-28";
  }
}

function toForm(course: CatalogCourse): FormState {
  const details = course.courseDetails;
  return {
    slug: course.slug,
    name: course.name,
    category: course.category,
    batchId: course.batchId,
    image: course.image ?? "",
    shortDescription: course.shortDescription ?? "",
    description: course.description ?? "",
    duration: course.duration,
    fee: String(course.fee),
    discountFee: course.discountFee == null ? "" : String(course.discountFee),
    overviewTitle: course.overviewTitle || "Chapters",
    status: course.status,
    couponEnabled: course.couponEnabled,
    featured: course.featured,
    contentLayout: (course.contentLayout === "flow-1" || course.contentLayout === "flow-2" || course.contentLayout === "flow-3"
      ? course.contentLayout
      : course.contentLayout === "paper" ? "flow-2" : course.contentLayout === "subject" ? "flow-3" : "flow-1"),
    totalClasses: course.totalClasses != null ? String(course.totalClasses) : "",
    totalExams: course.totalExams != null ? String(course.totalExams) : "",
    courseDuration: details?.duration ?? "",
    courseDescription: details?.description ?? "",
    courseTopics: (details?.topics ?? []).join("\n"),
    chapterOverview: (details?.chapterOverview ?? []).join("\n"),
    teachersJson: JSON.stringify(details?.teachers ?? []),
  };
}

export default function CourseManager({
  title,
  description,
  categoryFilter,
}: {
  title: string;
  description: string;
  categoryFilter?: CatalogCourseCategory;
}) {
  const gate = useAdminGate();
  const searchParams = useSearchParams();
  const [courses, setCourses] = useState<CatalogCourse[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [search, setSearch] = useState("");

  // Deep links from the Course Control replica:
  //   ?edit=<slug>            → open that course's edit form
  //   ?add=1&category=<name>  → open the add form pre-set to the category
  const requestedEditSlug = searchParams.get("edit");
  const autoAdd = searchParams.get("add") === "1";
  const requestedCategory = searchParams.get("category");

  const load = useCallback(async () => {
    setLoadError(false);
    try {
      const response = await fetch(
        categoryFilter
          ? `/api/admin/courses?category=${encodeURIComponent(categoryFilter)}`
          : "/api/admin/courses",
        { cache: "no-store", headers: gate.headers },
      );
      if (!response.ok) throw new Error("failed");
      const data = (await response.json()) as { courses?: CatalogCourse[] };
      // Backend already returns only this category's courses (?category=).
      const list = data.courses ?? [];
      setCourses(list);

      // Handle the deep-linked action once the list is available.
      if (requestedEditSlug) {
        const target = list.find((course) => course.slug === requestedEditSlug);
        if (target) {
          setForm(toForm(target));
          setEditingSlug(target.slug);
          setShowForm(true);
          setNotice(null);
        } else {
          setNotice({
            kind: "error",
            text: `Course “${requestedEditSlug}” was not found.`,
          });
        }
      } else if (autoAdd) {
        const category =
          (requestedCategory as CatalogCourseCategory) ??
          categoryFilter ??
          EMPTY_FORM.category;
        setForm({ ...EMPTY_FORM, category, batchId: defaultBatchFor(category) });
        setEditingSlug(null);
        setShowForm(true);
        setNotice(null);
      }
    } catch {
      setLoadError(true);
      setCourses([]);
    }
  }, [categoryFilter, gate.headers, requestedEditSlug, autoAdd, requestedCategory]);


  useEffect(() => {
    if (gate.ready) void Promise.resolve().then(load);
  }, [gate.ready, load]);

  if (!gate.ready) {
    return gate.denied ? (
      <AccessMessage
        title="Administrators only"
        message="Course management is restricted to authorized administrators."
        actionLabel="Back to Admin Home"
        actionHref="/admin"
      />
    ) : (
      <AccessLoading label="Loading courses…" />
    );
  }

  function startCreate() {
    setForm(EMPTY_FORM);
    setEditingSlug(null);
    setShowForm(true);
    setNotice(null);
  }

  function startEdit(course: CatalogCourse) {
    setForm(toForm(course));
    setEditingSlug(course.slug);
    setShowForm(true);
    setNotice(null);
  }

  async function handleSave() {
    setBusy(true);
    setNotice(null);
    try {
      let teachers: CourseDetails["teachers"] = [];
      try {
        teachers = JSON.parse(form.teachersJson || "[]") as CourseDetails["teachers"];
      } catch { /* ignore */ }
      if (!teachers) teachers = [];
      const courseDetails: CourseDetails = {
        duration: form.courseDuration.trim() || undefined,
        description: form.courseDescription.trim() || undefined,
        teachers: teachers.length > 0 ? teachers : undefined,
        topics: form.courseTopics.split("\n").map((s) => s.trim()).filter(Boolean),
        chapterOverview: form.chapterOverview.split("\n").map((s) => s.trim()).filter(Boolean),
      };
      const response = await fetch("/api/admin/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...gate.headers },
        body: JSON.stringify({
          ...form,
          fee: Number(form.fee) || 0,
          discountFee:
            form.discountFee.trim() === "" ? null : Number(form.discountFee),
          totalClasses: form.totalClasses.trim() === "" ? null : Number(form.totalClasses),
          totalExams: form.totalExams.trim() === "" ? null : Number(form.totalExams),
          courseDetails,
        }),
      });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
        course?: CatalogCourse;
      } | null;
      if (!response.ok) {
        setNotice({ kind: "error", text: data?.error ?? "Failed to save." });
        return;
      }
      setShowForm(false);
      await load();
      setNotice({ kind: "success", text: `“${data?.course?.name ?? form.name}” saved.` });
    } catch {
      setNotice({ kind: "error", text: "Failed to save the course." });
    } finally {
      setBusy(false);
    }
  }

  async function toggleFlags(
    slug: string,
    label: string,
    patch: { status?: "published" | "unpublished"; featured?: boolean },
  ) {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/courses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...gate.headers },
        body: JSON.stringify({ slug, ...patch }),
      });
      const data = (await response.json().catch(() => null)) as
        | { error?: string; course?: CatalogCourse }
        | null;
      if (!response.ok) {
        setNotice({ kind: "error", text: data?.error ?? "Failed to update." });
        return;
      }
      await load();
      setNotice({ kind: "success", text: `“${label}” updated.` });
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(slug: string, name: string) {
    if (!window.confirm(`Delete “${name}”? This cannot be undone.`)) return;
    setBusy(true);
    try {
      const response = await fetch("/api/admin/courses", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...gate.headers },
        body: JSON.stringify({ slug }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setNotice({ kind: "error", text: data?.error ?? "Failed to delete." });
        return;
      }
      await load();
      setNotice({ kind: "success", text: `“${name}” deleted.` });
    } finally {
      setBusy(false);
    }
  }

  const filtered = (courses ?? []).filter((course) =>
    `${course.name} ${course.slug}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-[#0b1e3a] admin-dark:text-white">
            {title}
          </h2>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-500 admin-dark:text-slate-400">
            {description}
          </p>
        </div>
        <button type="button" onClick={startCreate} className={buttonPrimaryClass}>
          + New Course
        </button>
      </header>

      <input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search courses…"
        className={`${inputClass} mt-5`}
      />

      {loadError ? (
        <div className={`${cardClass} mt-5 p-8 text-center`}>
          <p className="text-sm font-semibold text-slate-700 admin-dark:text-zinc-200">
            Could not load courses.
          </p>
          <button
            type="button"
            onClick={() => void load()}
            className={`${buttonPrimaryClass} mt-4`}
          >
            Try Again
          </button>
        </div>
      ) : courses === null ? (
        <p className={`${cardClass} mt-5 p-6 text-center text-sm text-slate-500`}>Loading…</p>
      ) : filtered.length === 0 ? (
        <p className={`${cardClass} mt-5 p-8 text-center text-sm text-slate-500`}>
          No courses yet. Create the first one.
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {filtered.map((course) => (
            <li key={course.slug} className={`${cardClass} p-4 sm:p-5`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-base font-bold text-[#0b1e3a] admin-dark:text-zinc-100">
                      {course.name}
                    </h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${
                        course.status === "published"
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-zinc-500/10 text-slate-500"
                      }`}
                    >
                      {course.status}
                    </span>
                    {course.featured && (
                      <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-amber-600">
                        ★ Featured
                      </span>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500 admin-dark:text-slate-400">
                    {course.shortDescription ?? "—"}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-slate-500">
                    {course.category} · {course.batchId.toUpperCase()} · ৳{" "}
                    {(course.discountFee ?? course.fee).toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void toggleFlags(course.slug, course.name, {
                        status:
                          course.status === "published"
                            ? "unpublished"
                            : "published",
                      })
                    }
                    className={buttonSecondaryClass}
                  >
                    {course.status === "published" ? "Unpublish" : "Publish"}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    aria-label={`Toggle featured for ${course.name}`}
                    title={course.featured ? "Remove from featured" : "Mark as featured"}
                    onClick={() =>
                      void toggleFlags(course.slug, course.name, {
                        featured: !course.featured,
                      })
                    }
                    className={
                      course.featured
                        ? "rounded-lg border border-amber-500/60 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-600 transition hover:bg-amber-500/20"
                        : buttonSecondaryClass
                    }
                  >
                    ★
                  </button>
                  <button type="button" onClick={() => startEdit(course)} className={buttonSecondaryClass}>
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(course.slug, course.name)}
                    disabled={busy}
                    aria-label={`Delete ${course.name}`}
                    className={buttonDangerClass}
                  >
                    ✕
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true">
          <div className={`${cardClass} max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-b-none p-5 sm:rounded-2xl sm:p-6`}>
            <h3 className="text-lg font-extrabold text-[#0b1e3a] admin-dark:text-zinc-100">
              {editingSlug ? "Edit Course" : "New Course"}
            </h3>

            {/* ── Course Card Information ── */}
            <div className="mt-5 rounded-xl border border-primary-500/40 bg-primary-600/5 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-primary-600">
                Course Card Information
              </p>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="cm-image">Course Banner</label>
                <MediaUploadField
                  id="cm-image"
                  label=""
                  value={form.image}
                  onChange={(url) => setForm({ ...form, image: url })}
                  directory="courses"
                  preview
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="cm-category">Course Category</label>
                <select id="cm-category" className={inputClass} value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as CatalogCourseCategory })}>
                  <option value="SSC Academic">SSC Academic</option>
                  <option value="HSC Academic">HSC Academic</option>
                  <option value="Medical Admission">Medical Admission</option>
                  <option value="Varsity Admission">Varsity Admission</option>
                </select>
              </div>
              <div>
                <label className={labelClass} htmlFor="cm-batch">Course Batch</label>
                <select id="cm-batch" className={inputClass} value={form.batchId}
                  onChange={(e) => setForm({ ...form, batchId: e.target.value })}>
                  <option value="hsc-28">HSC 28</option>
                  <option value="hsc-27">HSC 27</option>
                  <option value="hsc-26">HSC 26</option>
                  <option value="ssc-28">SSC 28</option>
                  <option value="ssc-27">SSC 27</option>
                  <option value="ssc-26">SSC 26</option>
                </select>
              </div>
              <div>
                <label className={labelClass} htmlFor="cm-name">Course Name</label>
                <input id="cm-name" className={inputClass} value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className={labelClass} htmlFor="cm-slug">Slug (auto-generated)</label>
                <input id="cm-slug" className={inputClass} value={form.slug} disabled={Boolean(editingSlug)}
                  onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })} />
              </div>
              <div>
                <label className={labelClass} htmlFor="cm-total-classes">Total Classes</label>
                <input id="cm-total-classes" type="number" min="0" className={inputClass} value={form.totalClasses}
                  placeholder="e.g. 48"
                  onChange={(e) => setForm({ ...form, totalClasses: e.target.value })} />
              </div>
              <div>
                <label className={labelClass} htmlFor="cm-total-exams">Total Exams</label>
                <input id="cm-total-exams" type="number" min="0" className={inputClass} value={form.totalExams}
                  placeholder="e.g. 12"
                  onChange={(e) => setForm({ ...form, totalExams: e.target.value })} />
              </div>
              <div>
                <label className={labelClass} htmlFor="cm-fee">Original Course Fee (৳)</label>
                <input id="cm-fee" type="number" min="0" className={inputClass} value={form.fee}
                  onChange={(e) => setForm({ ...form, fee: e.target.value })} />
              </div>
              <div>
                <label className={labelClass} htmlFor="cm-discount">Discount Fee (optional, ৳)</label>
                <input id="cm-discount" type="number" min="0" className={inputClass} value={form.discountFee}
                  onChange={(e) => setForm({ ...form, discountFee: e.target.value })} />
              </div>
              <div className="sm:col-span-2 flex flex-wrap items-center gap-6">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 admin-dark:text-zinc-200">
                  <input type="checkbox" className="h-4 w-4 accent-primary-600" checked={form.status === "published"}
                    onChange={(e) => setForm({ ...form, status: e.target.checked ? "published" : "unpublished" })} />
                  Published
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 admin-dark:text-zinc-200">
                  <input type="checkbox" className="h-4 w-4 accent-primary-600" checked={form.couponEnabled}
                    onChange={(e) => setForm({ ...form, couponEnabled: e.target.checked })} />
                  Coupon enabled
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 admin-dark:text-zinc-200">
                  <input type="checkbox" className="h-4 w-4 accent-primary-600" checked={form.featured}
                    onChange={(e) => setForm({ ...form, featured: e.target.checked })} />
                  ★ Featured Course
                </label>
              </div>
            </div>

            {/* ── Course Details ── */}
            <div className="mt-6 rounded-xl border border-primary-500/40 bg-primary-600/5 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-primary-600">
                Course Details
              </p>
              <p className="mt-0.5 text-xs text-slate-500 admin-dark:text-slate-400">
                Additional information shown on the course details page.
              </p>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="cm-cd-duration">Course Duration</label>
                <input id="cm-cd-duration" className={inputClass} value={form.courseDuration}
                  placeholder="e.g. 6 months"
                  onChange={(e) => setForm({ ...form, courseDuration: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Select Course Content Flow *</label>
                <p className="mb-3 text-xs text-neutral-500">
                  Choose how content is organized for students. This cannot be changed later without affecting existing content.
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {/* Flow 1 — Direct */}
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, contentLayout: "flow-1" })}
                    className={`group relative flex flex-col items-start rounded-xl border p-4 text-left transition ${
                      form.contentLayout === "flow-1"
                        ? "border-primary-500/60 bg-primary-600/10 shadow-md shadow-primary-900/20"
                        : "border-ink/15 bg-dark-900 hover:border-primary-500/30"
                    }`}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className={`text-sm font-bold ${form.contentLayout === "flow-1" ? "text-primary-300" : "text-heading"}`}>
                        Flow 1
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        form.contentLayout === "flow-1"
                          ? "bg-primary-500/20 text-primary-300"
                          : "bg-ink/10 text-neutral-500"
                      }`}>
                        Direct
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-neutral-400">Basic/simple subject-based course</p>
                    {/* Hierarchy preview */}
                    <div className="mt-3 w-full rounded-lg border border-ink/10 bg-dark-950 p-2.5">
                      <div className="flex flex-col gap-1 text-[10px]">
                        <div className="rounded bg-primary-500/15 px-2 py-1 text-center font-bold text-primary-300">Course</div>
                        <div className="ml-2 text-center text-neutral-600">↓</div>
                        <div className="rounded bg-ink/10 px-2 py-1 text-center font-semibold text-neutral-300">Class / Exam / Materials / Archive</div>
                        <div className="ml-2 text-center text-neutral-600">↓</div>
                        <div className="rounded bg-ink/10 px-2 py-1 text-center font-semibold text-neutral-300">Chapter</div>
                        <div className="ml-2 text-center text-neutral-600">↓</div>
                        <div className="rounded bg-ink/10 px-2 py-1 text-center font-semibold text-neutral-300">Content</div>
                      </div>
                    </div>
                    {form.contentLayout === "flow-1" && (
                      <div className="absolute right-2 top-2">
                        <svg className="h-5 w-5 text-primary-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </button>

                  {/* Flow 2 — Paper */}
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, contentLayout: "flow-2" })}
                    className={`group relative flex flex-col items-start rounded-xl border p-4 text-left transition ${
                      form.contentLayout === "flow-2"
                        ? "border-primary-500/60 bg-primary-600/10 shadow-md shadow-primary-900/20"
                        : "border-ink/15 bg-dark-900 hover:border-primary-500/30"
                    }`}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className={`text-sm font-bold ${form.contentLayout === "flow-2" ? "text-primary-300" : "text-heading"}`}>
                        Flow 2
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        form.contentLayout === "flow-2"
                          ? "bg-primary-500/20 text-primary-300"
                          : "bg-ink/10 text-neutral-500"
                      }`}>
                        Paper
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-neutral-400">Paper-based course (1st/2nd Paper)</p>
                    {/* Hierarchy preview */}
                    <div className="mt-3 w-full rounded-lg border border-ink/10 bg-dark-950 p-2.5">
                      <div className="flex flex-col gap-1 text-[10px]">
                        <div className="rounded bg-primary-500/15 px-2 py-1 text-center font-bold text-primary-300">Course</div>
                        <div className="ml-2 text-center text-neutral-600">↓</div>
                        <div className="rounded bg-ink/10 px-2 py-1 text-center font-semibold text-neutral-300">1st Paper / 2nd Paper</div>
                        <div className="ml-2 text-center text-neutral-600">↓</div>
                        <div className="rounded bg-ink/10 px-2 py-1 text-center font-semibold text-neutral-300">Class / Exam / Materials / Archive</div>
                        <div className="ml-2 text-center text-neutral-600">↓</div>
                        <div className="rounded bg-ink/10 px-2 py-1 text-center font-semibold text-neutral-300">Chapter</div>
                        <div className="ml-2 text-center text-neutral-600">↓</div>
                        <div className="rounded bg-ink/10 px-2 py-1 text-center font-semibold text-neutral-300">Content</div>
                      </div>
                    </div>
                    {form.contentLayout === "flow-2" && (
                      <div className="absolute right-2 top-2">
                        <svg className="h-5 w-5 text-primary-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </button>

                  {/* Flow 3 — Subject */}
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, contentLayout: "flow-3" })}
                    className={`group relative flex flex-col items-start rounded-xl border p-4 text-left transition ${
                      form.contentLayout === "flow-3"
                        ? "border-primary-500/60 bg-primary-600/10 shadow-md shadow-primary-900/20"
                        : "border-ink/15 bg-dark-900 hover:border-primary-500/30"
                    }`}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className={`text-sm font-bold ${form.contentLayout === "flow-3" ? "text-primary-300" : "text-heading"}`}>
                        Flow 3
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        form.contentLayout === "flow-3"
                          ? "bg-primary-500/20 text-primary-300"
                          : "bg-ink/10 text-neutral-500"
                      }`}>
                        Subject
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-neutral-400">Multi-subject course (Medical Admission)</p>
                    {/* Hierarchy preview */}
                    <div className="mt-3 w-full rounded-lg border border-ink/10 bg-dark-950 p-2.5">
                      <div className="flex flex-col gap-1 text-[10px]">
                        <div className="rounded bg-primary-500/15 px-2 py-1 text-center font-bold text-primary-300">Course</div>
                        <div className="ml-2 text-center text-neutral-600">↓</div>
                        <div className="rounded bg-ink/10 px-2 py-1 text-center font-semibold text-neutral-300">Subject</div>
                        <div className="ml-2 text-center text-neutral-600">↓</div>
                        <div className="rounded bg-ink/10 px-2 py-1 text-center font-semibold text-neutral-300">Class / Exam / Materials / Archive</div>
                        <div className="ml-2 text-center text-neutral-600">↓</div>
                        <div className="rounded bg-ink/10 px-2 py-1 text-center font-semibold text-neutral-300">Chapter</div>
                        <div className="ml-2 text-center text-neutral-600">↓</div>
                        <div className="rounded bg-ink/10 px-2 py-1 text-center font-semibold text-neutral-300">Content</div>
                      </div>
                    </div>
                    {form.contentLayout === "flow-3" && (
                      <div className="absolute right-2 top-2">
                        <svg className="h-5 w-5 text-primary-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </button>
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="cm-short">Short description</label>
                <textarea id="cm-short" rows={2} className={inputClass} value={form.shortDescription}
                  onChange={(e) => setForm({ ...form, shortDescription: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="cm-cd-desc">Course Description (detailed)</label>
                <textarea id="cm-cd-desc" rows={4} className={inputClass} value={form.courseDescription}
                  placeholder="Detailed description for the course details page..."
                  onChange={(e) => setForm({ ...form, courseDescription: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="cm-topics">Course Topics (one per line)</label>
                <textarea id="cm-topics" rows={4} className={inputClass} value={form.courseTopics}
                  placeholder={"What Will Be Taught:\nBiology fundamentals\nCell structure\nEvolution"}
                  onChange={(e) => setForm({ ...form, courseTopics: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="cm-overview">Chapter/Subject Overview (one per line)</label>
                <textarea id="cm-overview" rows={4} className={inputClass} value={form.chapterOverview}
                  placeholder={"Chapter 1: Introduction\nChapter 2: Cell Biology\nChapter 3: Genetics"}
                  onChange={(e) => setForm({ ...form, chapterOverview: e.target.value })} />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button type="button" onClick={handleSave} disabled={busy} className={buttonPrimaryClass}>
                {busy ? "Saving…" : "Save Course"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className={buttonSecondaryClass}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {notice && <p role="status" className={noticeClass(notice)}>{notice.text}</p>}
    </section>
  );
}
