import type { Metadata } from "next";
import AdminPlaceholder from "@/components/admin/AdminPlaceholder";
import { GraduationCapIcon } from "@/components/admin/icons";

export const metadata: Metadata = {
  title: "Academic Courses — MediSpark Admin",
  description: "Manage academic HSC courses by class and group.",
};

export default function AcademicCoursesPage() {
  return <AdminPlaceholder title="Academic Courses" description="Manage academic HSC courses by class and group." icon={GraduationCapIcon} />;
}
