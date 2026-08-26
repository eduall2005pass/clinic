import type { Metadata } from "next";
import CoursesView from "@/components/CoursesView";
import { getLivePublicCourses } from "@/lib/course-catalog";
import { fetchActiveCourseCategories } from "@/lib/course-categories-store";
import { fetchBatchFilterOptions } from "@/lib/course-filters";

// Cached at the edge; admin changes appear within 60s. Category/kind URL
// filters are applied client-side (see CoursesView) so this stays static.
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Courses",
  description:
    "Explore MediSpark courses — SSC academic, HSC academic, medical and varsity admission preparation programs.",
};

export default async function CoursesPage() {
  const [courses, categories, sscOptions, hscOptions] = await Promise.all([
    getLivePublicCourses(),
    fetchActiveCourseCategories(),
    fetchBatchFilterOptions("ssc"),
    fetchBatchFilterOptions("hsc"),
  ]);

  return (
    <CoursesView
      courses={courses}
      categories={categories.map((category) => ({
        id: category.id,
        slug: category.slug,
        name: category.name,
        description: category.description,
        imageUrl: category.imageUrl,
        href: category.href,
      }))}
      sscFilterOptions={sscOptions}
      hscFilterOptions={hscOptions}
    />
  );
}
