import { notFound } from "next/navigation";
import { fetchAllCourseCategories } from "@/lib/course-categories-store";
import PublicExamCategoryManager from "@/components/admin/PublicExamCategoryManager";

export const dynamic = "force-dynamic";

/**
 * Public Exam Control → <category> — dedicated exam list for ONE Course
 * Control category. The category id is the only relationship; exams are
 * isolated at the API/database level (?kind=public&categoryId=<id>).
 */
export default async function AdminPublicExamCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const categories = await fetchAllCourseCategories();
  const category = categories.find((item) => item.id === decodeURIComponent(id));
  if (!category) notFound();

  return (
    <PublicExamCategoryManager
      category={{ id: category.id, name: category.name }}
    />
  );
}
