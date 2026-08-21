import type { Metadata } from "next";
import AdminPlaceholder from "@/components/admin/AdminPlaceholder";
import { EnrollmentsIcon } from "@/components/admin/icons";

export const metadata: Metadata = {
  title: "Enrollments — MediSpark Admin",
  description: "Review and manage student course enrollments.",
};

export default function StudentEnrollmentsPage() {
  return <AdminPlaceholder title="Enrollments" description="Review and manage student course enrollments." icon={EnrollmentsIcon} />;
}
