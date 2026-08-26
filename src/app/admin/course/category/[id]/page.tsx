import { notFound } from "next/navigation";
import CategoryCourseManager from "@/components/admin/CategoryCourseManager";
import {
  fetchAllCourseCategories,
  DEFAULT_COURSE_CATEGORIES,
} from "@/lib/course-categories-store";

export const dynamic = "force-dynamic";

/**
 * Course Control → <category> → Courses. The category id drives every
 * query (GET /api/admin/courses?categoryId=) so only this category's
 * courses are ever returned, and new courses inherit this category_id.
 */
export default async function AdminCourseCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const decoded = decodeURIComponent(id);
  const categories = await fetchAllCourseCategories();
  let category = categories.find((item) => item.id === decoded && item.isActive);
  if (!category) {
    // The selection page appends canonical defaults that have no DB row yet
    // (fresh databases). Accept those ids here too so Explore never 404s —
    // an explicit row with the same slug always wins over the default.
    const fallback = DEFAULT_COURSE_CATEGORIES.find((item) => item.id === decoded);
    const hasExplicitRow = fallback
      ? categories.some((item) => item.slug === fallback.slug)
      : false;
    if (fallback && !hasExplicitRow) category = fallback;
  }
  if (!category) notFound();

  return (
    <CategoryCourseManager
      category={{ id: category.id, name: category.name, slug: category.slug }}
    />
  );
}
