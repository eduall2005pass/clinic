"use client";

import Link from "next/link";
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
import type { CatalogCourse } from "@/lib/courses-admin";

export type CategoryCourse = CatalogCourse & {
  totalClasses?: number;
  totalExams?: number;
  mentorIds?: string[];
};

type MentorOption = { id: string; name: string };
type BatchOption = { id: string; label?: string };

const EMPTY_FORM = {
  slug: "",
  name: "",
  batchId: "hsc-28",
  image: "",
  shortDescription: "",
  description: "",
  teacherName: "",
  designation: "",
  duration: "",
  fee: "0",
  discountFee: "",
  overviewTitle: "Chapters",
  status: "unpublished" as "published" | "unpublished",
  couponEnabled: false,
  featured: false,
  contentLayout: "auto" as "auto" | "direct" | "paper" | "subject",
};

type FormState = typeof EMPTY_FORM;

function defaultBatchFor(slug: string): string {
  return slug.includes("ssc") ? "ssc-29" : "hsc-29";
}

/**
 * One Course Control category's course list. The category context is fixed
 * for the entire flow — search, filters, cards, Add/Edit all operate ONLY on
 * this category's courses (GET ?categoryId= / POST with locked category_id).
 */
export default function CategoryCourseManager({
  category,
}: {
  category: { id: string; name: string; slug: string };
}) {
  const gate = useAdminGate();
  const [courses, setCourses] = useState<CategoryCourse[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [mentorIds, setMentorIds] = useState<string[]>([]);
  const [mentorOptions, setMentorOptions] = useState<MentorOption[]>([]);
  const [batchOptions, setBatchOptions] = useState<BatchOption[]>([]);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [search, setSearch] = useState("");
  const [batchFilter, setBatchFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "unpublished">("all");
  const [featuredFilter, setFeaturedFilter] = useState<"all" | "featured" | "normal">("all");

  // Deep links: ?edit=<slug> opens that course's edit form, ?add=1 opens add.
  const searchParams = useSearchParams();
  const requestedEditSlug = searchParams.get("edit");
  const autoAdd = searchParams.get("add") === "1";

  const load = useCallback(async () => {
    setLoadError(false);
    try {
      const response = await fetch(
        `/api/admin/courses?categoryId=${encodeURIComponent(category.id)}`,
        { cache: "no-store", headers: gate.headers },
      );
      if (!response.ok) throw new Error("failed");
      const data = (await response.json()) as { courses?: CategoryCourse[] };
      const list = data.courses ?? [];
      setCourses(list);

      if (requestedEditSlug) {
        const target = list.find((course) => course.slug === requestedEditSlug);
        if (target) openEdit(target);
        else
          setNotice({
            kind: "error",
            text: `Course “${requestedEditSlug}” was not found in this category.`,
          });
      } else if (autoAdd) {
        startCreate();
      }
    } catch {
      setLoadError(true);
      setCourses([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- openEdit/startCreate are stable setters
  }, [category.id, gate.headers, requestedEditSlug, autoAdd]);

  // Batch options come from the existing filter editor (scope by category).
  useEffect(() => {
    if (!gate.ready) return;
    fetch("/api/admin/course-filters", { cache: "no-store", headers: gate.headers })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { ssc?: BatchOption[]; hsc?: BatchOption[] } | null) => {
        const scoped = category.slug.includes("ssc")
          ? data?.ssc ?? []
          : data?.hsc ?? [];
        setBatchOptions(scoped.length > 0 ? scoped : [{ id: "all", label: "All Batches" }]);
      })
      .catch(() => setBatchOptions([{ id: "all", label: "All Batches" }]));
  }, [gate.ready, gate.headers, category.slug]);

  // Mentor options for the course↔mentor assignment picker.
  useEffect(() => {
    if (!gate.ready) return;
    fetch("/api/mentors", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { mentors?: MentorOption[] } | null) =>
        setMentorOptions(
          (data?.mentors ?? []).map((mentor) => ({
            id: mentor.id,
            name: mentor.name,
          })),
        ),
      )
      .catch(() => setMentorOptions([]));
  }, [gate.ready]);

  useEffect(() => {
    if (gate.ready)
      // eslint-disable-next-line react-hooks/set-state-in-effect -- standard admin gate load
      void load();
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
      <AccessLoading label="Loading courses..." />
    );
  }

  function startCreate() {
    setForm({
      ...EMPTY_FORM,
      batchId: defaultBatchFor(category.slug),
    });
    setMentorIds([]);
    setEditingSlug(null);
    setShowForm(true);
    setNotice(null);
  }

  function openEdit(course: CategoryCourse) {
    setForm({
      slug: course.slug,
      name: course.name,
      batchId: course.batchId || defaultBatchFor(category.slug),
      image: course.image ?? "",
      shortDescription: course.shortDescription ?? "",
      description: course.description ?? "",
      teacherName: course.teacherName,
      designation: course.designation,
      duration: course.duration,
      fee: String(course.fee),
      discountFee: course.discountFee == null ? "" : String(course.discountFee),
      overviewTitle: course.overviewTitle || "Chapters",
      status: course.status,
      couponEnabled: course.couponEnabled,
      featured: course.featured,
      contentLayout: course.contentLayout ?? "auto",
    });
    setMentorIds(course.mentorIds ?? []);
    setEditingSlug(course.slug);
    setShowForm(true);
    setNotice(null);
  }

  async function handleSave() {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...gate.headers },
        body: JSON.stringify({
          ...form,
          // Mandatory relationship — the open category owns this course.
          categoryId: category.id,
          mentorIds,
          fee: Number(form.fee) || 0,
          discountFee:
            form.discountFee.trim() === "" ? null : Number(form.discountFee),
        }),
      });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
        course?: CategoryCourse;
      } | null;
      if (!response.ok) {
        setNotice({ kind: "error", text: data?.error ?? "Failed to save." });
        return;
      }
      setShowForm(false);
      await load();
      setNotice({
        kind: "success",
        text: `“${data?.course?.name ?? form.name}” saved to ${category.name}.`,
      });
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
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
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

  // Filters + search apply ONLY to this category's courses. Computed after
  // the gate early-returns, so plain filtering keeps hook order stable.
  const term = search.trim().toLowerCase();
  const filtered = (courses ?? []).filter((course) => {
    if (term && !`${course.name} ${course.slug}`.toLowerCase().includes(term))
      return false;
    if (batchFilter !== "all" && course.batchId !== batchFilter) return false;
    if (statusFilter !== "all" && course.status !== statusFilter) return false;
    if (featuredFilter === "featured" && !course.featured) return false;
    if (featuredFilter === "normal" && course.featured) return false;
    return true;
  });

  return (
    <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <nav className="flex flex-wrap items-center gap-2 text-xs font-semibold text-zinc-500">
        <Link href="/admin/course" className="transition hover:text-primary-600">
          Course Control
        </Link>
        <span aria-hidden="true">→</span>
        <span className="text-zinc-900 admin-dark:text-zinc-100">{category.name}</span>
      </nav>

      <header className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 admin-dark:text-zinc-50">
            {category.name} — Courses
          </h1>
          <p className="mt-1 max-w-xl text-sm text-zinc-500 admin-dark:text-zinc-400">
            Only courses belonging to {category.name} are listed here.
          </p>
        </div>
        <button type="button" onClick={startCreate} className={buttonPrimaryClass}>
          + Add Course
        </button>
      </header>

      {/* Search + filters — scoped to this category only */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={`Search ${category.name} courses…`}
          className={inputClass}
        />
        <select value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)} className={inputClass} aria-label="Batch filter">
          {(batchOptions.length > 0
            ? batchOptions
            : [{ id: "all", label: "All Batches" }]
          ).map((option) => (
            <option key={option.id} value={option.id}>
              {option.label ?? option.id}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className={inputClass}
          aria-label="Status filter"
        >
          <option value="all">All Statuses</option>
          <option value="published">Published</option>
          <option value="unpublished">Unpublished</option>
        </select>
        <select
          value={featuredFilter}
          onChange={(e) => setFeaturedFilter(e.target.value as typeof featuredFilter)}
          className={inputClass}
          aria-label="Featured filter"
        >
          <option value="all">Featured &amp; Normal</option>
          <option value="featured">★ Featured only</option>
          <option value="normal">Normal only</option>
        </select>
      </div>

      {loadError ? (
        <div className={`${cardClass} mt-5 p-8 text-center`}>
          <p className="text-sm font-semibold text-zinc-700 admin-dark:text-zinc-200">
            Could not load courses.
          </p>
          <button type="button" onClick={() => void load()} className={`${buttonPrimaryClass} mt-4`}>
            Try Again
          </button>
        </div>
      ) : courses === null ? (
        <p className={`${cardClass} mt-5 p-6 text-center text-sm text-zinc-500`}>
          Loading courses...
        </p>
      ) : filtered.length === 0 ? (
        <div className="mt-5">
          <p className={`${cardClass} p-8 text-center text-sm text-zinc-500`}>
            No courses available in this category.
          </p>
          <button type="button" onClick={startCreate} className={`${buttonPrimaryClass} mt-4 w-full py-3`}>
            + Add Course
          </button>
        </div>
      ) : (
        <>
          <ul className="mt-5 space-y-3">
            {filtered.map((course) => (
              <li key={course.slug} className={`${cardClass} p-4 sm:p-5`}>
                <div className="flex flex-wrap items-start gap-3">
                  {course.image ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={course.image}
                      alt=""
                      className="h-16 w-24 shrink-0 rounded-lg border border-neutral-200 object-cover admin-dark:border-zinc-700"
                    />
                  ) : (
                    <span className="flex h-16 w-24 shrink-0 items-center justify-center rounded-lg border border-dashed border-neutral-300 text-[10px] font-bold uppercase text-zinc-400 admin-dark:border-zinc-700">
                      No banner
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/admin/course/category/${encodeURIComponent(category.id)}/course/${encodeURIComponent(course.slug)}`}
                        className="truncate text-base font-bold text-zinc-900 transition hover:text-primary-600 admin-dark:text-zinc-100"
                      >
                        {course.name}
                      </Link>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${
                          course.status === "published"
                            ? "bg-emerald-500/10 text-emerald-600"
                            : "bg-zinc-500/10 text-zinc-500"
                        }`}
                      >
                        {course.status}
                      </span>
                      {course.featured && (
                        <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-amber-600">
                          ★ Featured
                        </span>
                      )}
                      {course.couponEnabled && (
                        <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-sky-600">
                          Coupon
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs font-semibold text-zinc-500">
                      Batch {course.batchId.toUpperCase()} · Regular ৳{" "}
                      {course.fee.toLocaleString("en-IN")}
                      {course.discountFee != null &&
                        ` · Discount ৳ ${course.discountFee.toLocaleString("en-IN")}`}
                      {" · "}
                      {course.totalClasses ?? 0} classes · {course.totalExams ?? 0} exams
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-start gap-2">
                    <Link
                      href={`/admin/course/category/${encodeURIComponent(category.id)}/course/${encodeURIComponent(course.slug)}`}
                      className={buttonSecondaryClass}
                    >
                      View Details
                    </Link>
                    <button type="button" onClick={() => openEdit(course)} className={buttonSecondaryClass}>
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void toggleFlags(course.slug, course.name, {
                          status:
                            course.status === "published" ? "unpublished" : "published",
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

          <button type="button" onClick={startCreate} className={`${buttonPrimaryClass} mt-5 w-full py-3`}>
            + Add Course
          </button>
        </>
      )}

      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
        >
          <div className={`${cardClass} max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-b-none p-5 sm:rounded-2xl sm:p-6`}>
            <h3 className="text-lg font-extrabold text-zinc-900 admin-dark:text-zinc-100">
              {editingSlug ? "Edit Course" : "Add Course"}
            </h3>

            {/* Locked category — the admin is already inside it. */}
            <div className="mt-4 rounded-xl border border-primary-500/40 bg-primary-600/5 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-primary-600">
                Category (locked)
              </p>
              <p className="mt-0.5 text-sm font-bold text-zinc-900 admin-dark:text-zinc-100">
                {category.name}
              </p>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="ccm-name">Course Name</label>
                <input id="ccm-name" className={inputClass} value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className={labelClass} htmlFor="ccm-slug">
                  Course Slug (lowercase, URL-friendly)
                </label>
                <input id="ccm-slug" className={inputClass} value={form.slug} disabled={Boolean(editingSlug)}
                  placeholder="ssc-biology-advanced"
                  onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })} />
              </div>
              <div>
                <label className={labelClass} htmlFor="ccm-batch">Batch</label>
                <select id="ccm-batch" className={inputClass} value={form.batchId}
                  onChange={(e) => setForm({ ...form, batchId: e.target.value })}>
                  <option value="hsc-29">HSC 29</option>
                  <option value="hsc-28">HSC 28</option>
                  <option value="hsc-27">HSC 27</option>
                  <option value="hsc-26">HSC 26</option>
                  <option value="ssc-29">SSC 29</option>
                  <option value="ssc-28">SSC 28</option>
                  <option value="ssc-27">SSC 27</option>
                  <option value="ssc-26">SSC 26</option>
                </select>
              </div>
              <div>
                <MediaUploadField
                  id="ccm-image"
                  label="Course Banner"
                  value={form.image}
                  onChange={(url) => setForm({ ...form, image: url })}
                  directory="courses"
                  preview
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="ccm-fee">Regular Fee (৳)</label>
                <input id="ccm-fee" type="number" min="0" className={inputClass} value={form.fee}
                  onChange={(e) => setForm({ ...form, fee: e.target.value })} />
              </div>
              <div>
                <label className={labelClass} htmlFor="ccm-discount">Discount Fee (optional)</label>
                <input id="ccm-discount" type="number" min="0" className={inputClass} value={form.discountFee}
                  onChange={(e) => setForm({ ...form, discountFee: e.target.value })} />
              </div>
              <div>
                <label className={labelClass} htmlFor="ccm-duration">Course Duration</label>
                <input id="ccm-duration" className={inputClass} value={form.duration}
                  placeholder="e.g. 6 months"
                  onChange={(e) => setForm({ ...form, duration: e.target.value })} />
              </div>
              <div>
                <label className={labelClass} htmlFor="ccm-layout">Content structure (student site)</label>
                <select id="ccm-layout" className={inputClass} value={form.contentLayout}
                  onChange={(e) =>
                    setForm({ ...form, contentLayout: e.target.value as FormState["contentLayout"] })
                  }>
                  <option value="auto">Auto (based on course type)</option>
                  <option value="direct">Direct — Class / Exam / Materials cards</option>
                  <option value="paper">Paper Selection (১ম / ২য় পত্র)</option>
                  <option value="subject">Subject Selection (Medical Admission)</option>
                </select>
              </div>
              <div>
                <label className={labelClass} htmlFor="ccm-teacher">Teacher name</label>
                <input id="ccm-teacher" className={inputClass} value={form.teacherName}
                  onChange={(e) => setForm({ ...form, teacherName: e.target.value })} />
              </div>
              <div>
                <label className={labelClass} htmlFor="ccm-designation">Designation</label>
                <input id="ccm-designation" className={inputClass} value={form.designation}
                  onChange={(e) => setForm({ ...form, designation: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="ccm-short">Short description</label>
                <textarea id="ccm-short" rows={2} className={inputClass} value={form.shortDescription}
                  onChange={(e) => setForm({ ...form, shortDescription: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="ccm-desc">Full description</label>
                <textarea id="ccm-desc" rows={4} className={inputClass} value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>

              {/* Mentors assignment — specific to THIS course. */}
              <div className="sm:col-span-2">
                <span className={labelClass}>Mentors (this course)</span>
                {mentorOptions.length === 0 ? (
                  <p className="mt-1 text-xs text-zinc-500">
                    No mentors available — add them in Admin → Mentors first.
                  </p>
                ) : (
                  <div className="mt-2 max-h-44 space-y-1.5 overflow-y-auto rounded-xl border border-neutral-200 p-3 admin-dark:border-zinc-700">
                    {mentorOptions.map((mentor) => (
                      <label key={mentor.id} className="flex items-center gap-2 text-sm text-zinc-700 admin-dark:text-zinc-200">
                        <input
                          type="checkbox"
                          checked={mentorIds.includes(mentor.id)}
                          onChange={(event) =>
                            setMentorIds(
                              event.target.checked
                                ? [...mentorIds, mentor.id]
                                : mentorIds.filter((id) => id !== mentor.id),
                            )
                          }
                        />
                        <span className="truncate">{mentor.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="sm:col-span-2 flex flex-wrap items-center gap-6">
                <label className="flex items-center gap-2 text-sm font-semibold text-zinc-700 admin-dark:text-zinc-200">
                  <input type="checkbox" className="h-4 w-4 accent-primary-600" checked={form.status === "published"}
                    onChange={(e) => setForm({ ...form, status: e.target.checked ? "published" : "unpublished" })} />
                  Published
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold text-zinc-700 admin-dark:text-zinc-200">
                  <input type="checkbox" className="h-4 w-4 accent-primary-600" checked={form.couponEnabled}
                    onChange={(e) => setForm({ ...form, couponEnabled: e.target.checked })} />
                  Coupon enabled
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold text-zinc-700 admin-dark:text-zinc-200">
                  <input type="checkbox" className="h-4 w-4 accent-primary-600" checked={form.featured}
                    onChange={(e) => setForm({ ...form, featured: e.target.checked })} />
                  ★ Featured
                </label>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button type="button" onClick={handleSave} disabled={busy} className={buttonPrimaryClass}>
                {busy ? "Saving…" : editingSlug ? "Update Course" : "Create Course"}
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
