import type { Metadata } from "next";
import AdminPlaceholder from "@/components/admin/AdminPlaceholder";
import { EnrollmentsIcon } from "@/components/admin/icons";

export const metadata: Metadata = {
  title: "Enrolled Exams — MediSpark Admin",
  description: "Create and manage exams for enrolled students.",
};

export default function EnrolledExamsPage() {
  return <AdminPlaceholder title="Enrolled Exams" description="Create and manage exams for enrolled students." icon={EnrollmentsIcon} />;
}
