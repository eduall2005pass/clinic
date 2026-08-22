import CourseManager from "@/components/admin/CourseManager";

export const metadata = {
  title: "Academic Courses — MediSpark Admin",
  description: "Manage academic HSC courses by class and group.",
};

export default function AcademicCoursesPage() {
  return (
    <CourseManager
      title="Academic Courses"
      description="Create and manage HSC academic courses — Botany, Zoology, revision and more."
      categoryFilter="Academic"
    />
  );
}
