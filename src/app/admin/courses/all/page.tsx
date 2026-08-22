import CourseManager from "@/components/admin/CourseManager";

export const metadata = {
  title: "All Courses — MediSpark Admin",
  description: "Create and manage every course on the platform.",
};

export default function AllCoursesPage() {
  return (
    <CourseManager
      title="All Courses"
      description="Create and manage every course on the platform — academic and admission, all batches."
    />
  );
}
