import CourseManager from "@/components/admin/CourseManager";

export const metadata = {
  title: "Admission Courses — MediSpark Admin",
  description: "Manage medical admission preparation courses.",
};

export default function AdmissionCoursesPage() {
  return (
    <CourseManager
      title="Admission Courses"
      description="Create and manage medical admission preparation courses for every batch."
      categoryFilter="Medical Admission"
    />
  );
}
