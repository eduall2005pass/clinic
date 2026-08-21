import type { Metadata } from "next";
import AdminPlaceholder from "@/components/admin/AdminPlaceholder";
import { TagIcon } from "@/components/admin/icons";

export const metadata: Metadata = {
  title: "Admission Courses — MediSpark Admin",
  description: "Manage medical and university admission courses.",
};

export default function AdmissionCoursesPage() {
  return <AdminPlaceholder title="Admission Courses" description="Manage medical and university admission courses." icon={TagIcon} />;
}
