import CourseManager from "@/components/admin/CourseManager";

export const metadata = {
  title: "Varsity Admission Courses — MediSpark Admin",
  description: "Manage varsity admission preparation courses.",
};

export default function VarsityCoursesAdminPage() {
  return (
    <CourseManager
      title="Varsity Admission Courses"
      description="Create and manage varsity admission preparation courses for every batch."
      categoryFilter="Varsity Admission"
    />
  );
}
