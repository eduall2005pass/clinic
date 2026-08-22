import CourseManager from "@/components/admin/CourseManager";

export const metadata = {
  title: "SSC Academic Courses — MediSpark Admin",
  description: "Manage SSC academic courses by batch.",
};

export default function SscCoursesPage() {
  return (
    <CourseManager
      title="SSC Academic Courses"
      description="Create and manage SSC academic courses for every batch."
      categoryFilter="SSC Academic"
    />
  );
}
