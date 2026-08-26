import { notFound } from "next/navigation";
import CategoryCourseManager from "@/components/admin/CategoryCourseManager";
import {
  fetchAllCourseCategories,
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
  const categories = await fetchAllCourseCategories();
  const category = categories.find(
    (item) => item.id === decodeURIComponent(id) && item.isActive,
  );
  if (!category) notFound();

  return (
    <CategoryCourseManager
      category={{ id: category.id, name: category.name, slug: category.slug }}
    />
  );
}
