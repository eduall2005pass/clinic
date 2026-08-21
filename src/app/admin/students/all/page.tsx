import type { Metadata } from "next";
import AdminPlaceholder from "@/components/admin/AdminPlaceholder";
import { StudentsIcon } from "@/components/admin/icons";

export const metadata: Metadata = {
  title: "All Students — MediSpark Admin",
  description: "View and manage every registered student.",
};

export default function AllStudentsPage() {
  return <AdminPlaceholder title="All Students" description="View and manage every registered student." icon={StudentsIcon} />;
}
