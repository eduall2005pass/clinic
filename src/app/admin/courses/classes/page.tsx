import type { Metadata } from "next";
import AdminPlaceholder from "@/components/admin/AdminPlaceholder";
import { GraduationCapIcon } from "@/components/admin/icons";

export const metadata: Metadata = {
  title: "Classes — MediSpark Admin",
  description: "Manage class levels used across academic courses.",
};

export default function CourseClassesPage() {
  return <AdminPlaceholder title="Classes" description="Manage class levels used across academic courses." icon={GraduationCapIcon} />;
}
