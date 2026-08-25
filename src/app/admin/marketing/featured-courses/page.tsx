"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AccessLoading, AccessMessage } from "@/components/auth/AccessGuard";
import { formatFee } from "@/lib/courses";
import type { FeaturedCourseRecord } from "@/lib/featured-courses";

type Notice = { kind: "success" | "error"; text: string };

/** Minimal live-catalog info needed by this page (from /api/admin/courses). */
type CatalogItem = {
  slug: string;
  name: string;
  category: string;
  fee: number;
  discountFee: number | null;
};

function payableFee(course: CatalogItem): number {
  return course.discountFee != null ? course.discountFee : course.fee;
}

export default function FeaturedCoursesPage() {
  const { user, authLoading } = useAuth();

  const [featured, setFeatured] = useState<FeaturedCourseRecord[] | null>(null);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [adminStatus, setAdminStatus] = useState<
    "checking" | "admin" | "denied"
  >("checking");

  // Admin check
  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    user
      .getIdToken()
      .then((token) =>
        fetch("/api/admin", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }),
      )
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { isAdmin?: boolean } | null) => {
        if (!cancelled) setAdminStatus(data?.isAdmin ? "admin" : "denied");
      })
      .catch(() => {
        if (!cancelled) setAdminStatus("denied");
      });
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  // Load current featured selection + live course catalog (MySQL).
  useEffect(() => {
    if (authLoading || !user || adminStatus !== "admin") return;
    let cancelled = false;
    async function load() {
      try {
        const token = await user!.getIdToken();
        const headers = { Authorization: `Bearer ${token}` };
        const [featuredResponse, catalogResponse] = await Promise.all([
          fetch("/api/featured-courses/all", {
            headers,
            cache: "no-store",
          }),
          fetch("/api/admin/courses", { headers, cache: "no-store" }),
        ]);
        if (featuredResponse.ok) {
          const data = (await featuredResponse.json()) as {
            courses?: FeaturedCourseRecord[];
          };
          if (data.courses && !cancelled) setFeatured(data.courses);
        }
        if (catalogResponse.ok) {
          const data = (await catalogResponse.json()) as {
            courses?: Array<{
              slug: string;
              name: string;
              category: string;
              fee: number;
              discountFee: number | null;
            }>;
          };
          if (data.courses && !cancelled) {
            setCatalog(
              data.courses.map((course) => ({
                slug: course.slug,
                name: course.name,
                category: course.category,
                fee: Number(course.fee) || 0,
                discountFee:
                  course.discountFee == null
                    ? null
                    : Number(course.discountFee),
              })),
            );
          }
        }
      } catch {
        // Keep loading state cleared below
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, adminStatus]);

  const adminCheck = !authLoading && !user ? "denied" : adminStatus;

  if (authLoading || adminCheck === "checking" || initialLoading) {
    return <AccessLoading label="Loading featured courses…" />;
  }

  if (adminCheck === "denied") {
    return (
      <AccessMessage
        title="Administrators only"
        message="Featured course settings are restricted to authorized administrators."
        actionLabel="Back to Admin Home"
        actionHref="/admin"
      />
    );
  }

  function featureCourse(slug: string) {
    setFeatured((prev) => [
      ...(prev ?? []),
      { courseSlug: slug, isActive: true },
    ]);
  }

  function unfeatureCourse(slug: string) {
    setFeatured((prev) =>
      (prev ?? []).filter((record) => record.courseSlug !== slug),
    );
  }

  function toggleCourse(slug: string) {
    setFeatured((prev) =>
      (prev ?? []).map((record) =>
        record.courseSlug === slug
          ? { ...record, isActive: !record.isActive }
          : record,
      ),
    );
  }

  function moveCourse(index: number, direction: -1 | 1) {
    setFeatured((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function handleSave() {
    if (!user || !featured) return;
    setBusy(true);
    setNotice(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/featured-courses", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          courses: featured.map((record) => ({
            slug: record.courseSlug,
            isActive: record.isActive,
          })),
        }),
      });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
        courses?: FeaturedCourseRecord[];
      } | null;
      if (!response.ok) {
        setNotice({
          kind: "error",
          text: data?.error ?? "Failed to save the featured courses.",
        });
        return;
      }
      if (data?.courses) setFeatured(data.courses);
      setNotice({
        kind: "success",
        text: "Featured courses saved. Changes are now live on the homepage.",
      });
    } catch {
      setNotice({ kind: "error", text: "Failed to save the featured courses." });
    } finally {
      setBusy(false);
    }
  }

  const iconButtonClass =
    "flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-zinc-500 transition hover:border-primary-500/60 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-30 admin-dark:border-zinc-700 admin-dark:text-zinc-400";
  const cardClass =
    "rounded-2xl border border-neutral-200 bg-white shadow-sm transition-colors duration-300 admin-dark:border-zinc-800 admin-dark:bg-zinc-900";

  const featuredSlugs = new Set((featured ?? []).map((r) => r.courseSlug));
  const available = catalog.filter((course) => !featuredSlugs.has(course.slug));

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      {/* Page header */}
      <header>
        <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 admin-dark:text-zinc-50">
          Featured Courses
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-zinc-500 admin-dark:text-zinc-400">
          Choose which courses appear in the homepage featured section,
          change their display order and enable or disable them.
        </p>
      </header>

      {!featured ? (
        <p className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-500">
          Failed to load the current selection. Please refresh the page.
        </p>
      ) : (
        <>
          {/* Featured list */}
          <div className={`${cardClass} mt-6 p-4 sm:p-5`}>
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-zinc-400">
              Featured ({featured.length})
            </h3>

            {featured.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-neutral-300 p-4 text-center text-xs font-semibold text-zinc-500 admin-dark:border-zinc-700">
                No courses featured yet. Add one from the catalog below.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {featured.map((record, index) => {
                  const course = catalog.find(
                    (item) => item.slug === record.courseSlug,
                  );
                  return (
                    <li
                      key={record.courseSlug}
                      className={`flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 transition ${
                        record.isActive
                          ? "border-neutral-200 bg-neutral-50 admin-dark:border-zinc-700 admin-dark:bg-zinc-800/60"
                          : "border-dashed border-neutral-300 bg-transparent opacity-60 admin-dark:border-zinc-700"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={record.isActive}
                        onChange={() => toggleCourse(record.courseSlug)}
                        className="h-4 w-4 shrink-0 accent-primary-600"
                        aria-label={`Enable ${course?.name ?? record.courseSlug}`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-zinc-900 admin-dark:text-zinc-100">
                          {index + 1}. {course?.name ?? record.courseSlug}
                        </span>
                        <span className="block truncate text-xs text-zinc-500">
                          {course
                            ? `${course.category} · ${
                                course.fee > 0
                                  ? formatFee(payableFee(course))
                                  : "Free"
                              }`
                            : "Unknown course"}
                        </span>
                      </span>
                      <span className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => moveCourse(index, -1)}
                          disabled={index === 0}
                          aria-label="Move up"
                          className={iconButtonClass}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveCourse(index, 1)}
                          disabled={index === featured.length - 1}
                          aria-label="Move down"
                          className={iconButtonClass}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => unfeatureCourse(record.courseSlug)}
                          aria-label={`Remove ${course?.name ?? record.courseSlug}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-red-500 transition hover:border-red-500/60 hover:bg-red-500/10 admin-dark:border-zinc-700"
                        >
                          ✕
                        </button>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Catalog */}
          <div className={`${cardClass} mt-6 p-4 sm:p-5`}>
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-zinc-400">
              Course Catalog
            </h3>
            {available.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-neutral-300 p-4 text-center text-xs font-semibold text-zinc-500 admin-dark:border-zinc-700">
                All published courses are already featured.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {available.map((course) => (
                  <li
                    key={course.slug}
                    className="flex flex-wrap items-center gap-3 rounded-xl bg-neutral-50 px-4 py-2.5 admin-dark:bg-zinc-800/60"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-zinc-900 admin-dark:text-zinc-100">
                        {course.name}
                      </span>
                      <span className="block truncate text-xs text-zinc-500">
                        {course.category} ·{" "}
                        {course.fee > 0
                          ? formatFee(payableFee(course))
                          : "Free"}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => featureCourse(course.slug)}
                      className="shrink-0 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-bold text-zinc-600 transition hover:border-primary-500/60 hover:text-primary-600 admin-dark:border-zinc-700 admin-dark:text-zinc-300"
                    >
                      + Feature
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {notice && (
            <p
              role="status"
              className={`mt-6 rounded-xl border px-4 py-3 text-sm font-semibold ${
                notice.kind === "success"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 admin-dark:text-emerald-400"
                  : "border-red-500/30 bg-red-500/10 text-red-500"
              }`}
            >
              {notice.text}
            </p>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={busy}
            className="mt-6 w-full rounded-xl bg-primary-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-primary-900/30 transition hover:bg-primary-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {busy ? "Saving…" : "Save Changes"}
          </button>
        </>
      )}
    </section>
  );
}
