/**
 * Shared frontend logic for the Admin Panel's Category → Courses flow.
 * Every section uses this instead of hand-rolling its own fetch, so course
 * data always comes from Course Control via GET /api/admin/courses?categoryId=
 * (backend-enforced isolation on catalog_courses.category_id).
 */

export type CatalogCourseLite = {
  slug: string;
  name: string;
  image?: string | null;
  category?: string;
  status?: string;
};

export type CategoryCoursesResult =
  | { status: "ok"; courses: CatalogCourseLite[] }
  | { status: "invalid-category" }
  | { status: "error" };

export async function fetchCoursesByCategory(
  token: string,
  categoryId: string,
): Promise<CategoryCoursesResult> {
  if (!categoryId.trim()) return { status: "invalid-category" };
  try {
    const res = await fetch(
      `/api/admin/courses?categoryId=${encodeURIComponent(categoryId)}`,
      {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    if (res.status === 404) return { status: "invalid-category" };
    if (!res.ok) return { status: "error" };
    const data = (await res.json()) as { courses?: CatalogCourseLite[] };
    if (!Array.isArray(data.courses)) return { status: "error" };
    return { status: "ok", courses: data.courses };
  } catch {
    return { status: "error" };
  }
}

/** Course Control categories (single source of truth for every selector). */
export async function fetchCategoryOptions(): Promise<
  Array<{ id: string; name: string }>
> {
  try {
    const res = await fetch("/api/course-categories", { cache: "no-store" });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      categories?: Array<{ id: string; name: string }>;
    };
    return Array.isArray(data.categories) ? data.categories : [];
  } catch {
    return [];
  }
}
