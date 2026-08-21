import type { Metadata } from "next";
import AdminPlaceholder from "@/components/admin/AdminPlaceholder";
import { CoursesIcon } from "@/components/admin/icons";

export const metadata: Metadata = {
  title: "All Courses — MediSpark Admin",
  description: "Create and manage every course on the platform.",
};

export default function AllCoursesPage() {
  return <AdminPlaceholder title="All Courses" description="Create and manage every course on the platform." icon={CoursesIcon} />;
}
