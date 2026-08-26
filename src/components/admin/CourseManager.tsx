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
} from "@/lib/courses-admin";

export type CatalogCourse = {
  slug: string;
  name: string;
  category: CatalogCourseCategory;
  batchId: string;
  image: string | null;
  shortDescription: string | null;
  description: string | null;
  teacherName: string;
  teacherPhoto: string | null;
  designation: string;
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
};

const EMPTY_FORM = {
  slug: "",
  name: "",
  category: "HSC Academic" as CatalogCourseCategory,
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
  return {
    slug: course.slug,
    name: course.name,
    category: course.category,
    batchId: course.batchId,
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
      const response = await fetch("/api/admin/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...gate.headers },
        body: JSON.stringify({
          ...form,
          fee: Number(form.fee) || 0,
          discountFee:
            form.discountFee.trim() === "" ? null : Number(form.discountFee),
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
          <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 admin-dark:text-zinc-50">
            {title}
          </h2>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-zinc-500 admin-dark:text-zinc-400">
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
          <p className="text-sm font-semibold text-zinc-700 admin-dark:text-zinc-200">
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
        <p className={`${cardClass} mt-5 p-6 text-center text-sm text-zinc-500`}>Loading…</p>
      ) : filtered.length === 0 ? (
        <p className={`${cardClass} mt-5 p-8 text-center text-sm text-zinc-500`}>
          No courses yet. Create the first one.
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {filtered.map((course) => (
            <li key={course.slug} className={`${cardClass} p-4 sm:p-5`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-base font-bold text-zinc-900 admin-dark:text-zinc-100">
                      {course.name}
                    </h3>
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
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-500 admin-dark:text-zinc-400">
                    {course.shortDescription ?? "—"}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-zinc-500">
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
            <h3 className="text-lg font-extrabold text-zinc-900 admin-dark:text-zinc-100">
              {editingSlug ? "Edit Course" : "New Course"}
            </h3>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="cm-name">Name</label>
                <input id="cm-name" className={inputClass} value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className={labelClass} htmlFor="cm-slug">Slug (lowercase-dash)</label>
                <input id="cm-slug" className={inputClass} value={form.slug} disabled={Boolean(editingSlug)}
                  onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })} />
              </div>
              <div>
                <label className={labelClass} htmlFor="cm-category">Course type</label>
                <select id="cm-category" className={inputClass} value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as CatalogCourseCategory })}>
                  <option value="SSC Academic">SSC Academic</option>
                  <option value="HSC Academic">HSC Academic</option>
                  <option value="Medical Admission">Medical Admission</option>
                  <option value="Varsity Admission">Varsity Admission</option>
                </select>
              </div>
              <div>
                <label className={labelClass} htmlFor="cm-batch">Batch</label>
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
                <label className={labelClass} htmlFor="cm-fee">Fee (৳)</label>
                <input id="cm-fee" type="number" min="0" className={inputClass} value={form.fee}
                  onChange={(e) => setForm({ ...form, fee: e.target.value })} />
              </div>
              <div>
                <label className={labelClass} htmlFor="cm-discount">Discount fee (optional)</label>
                <input id="cm-discount" type="number" min="0" className={inputClass} value={form.discountFee}
                  onChange={(e) => setForm({ ...form, discountFee: e.target.value })} />
              </div>
              <div>
                <label className={labelClass} htmlFor="cm-teacher">Teacher name</label>
                <input id="cm-teacher" className={inputClass} value={form.teacherName}
                  onChange={(e) => setForm({ ...form, teacherName: e.target.value })} />
              </div>
              <div>
                <label className={labelClass} htmlFor="cm-designation">Designation</label>
                <input id="cm-designation" className={inputClass} value={form.designation}
                  onChange={(e) => setForm({ ...form, designation: e.target.value })} />
              </div>
              <div>
                <label className={labelClass} htmlFor="cm-duration">Duration</label>
                <input id="cm-duration" className={inputClass} value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: e.target.value })} />
              </div>
              <div>
                <label className={labelClass} htmlFor="cm-layout">Content structure (student site)</label>
                <select id="cm-layout" className={inputClass} value={form.contentLayout}
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
                <MediaUploadField
                  id="cm-image"
                  label="Course image"
                  value={form.image}
                  onChange={(url) => setForm({ ...form, image: url })}
                  directory="courses"
                  preview
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="cm-short">Short description</label>
                <textarea id="cm-short" rows={2} className={inputClass} value={form.shortDescription}
                  onChange={(e) => setForm({ ...form, shortDescription: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="cm-desc">Full description</label>
                <textarea id="cm-desc" rows={4} className={inputClass} value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })} />
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
