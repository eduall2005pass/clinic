import type { Metadata } from "next";
import AdminPlaceholder from "@/components/admin/AdminPlaceholder";
import { BookmarkIcon } from "@/components/admin/icons";

export const metadata: Metadata = {
  title: "Subjects — MediSpark Admin",
  description: "Manage subjects that structure courses and exams.",
};

export default function CourseSubjectsPage() {
  return <AdminPlaceholder title="Subjects" description="Manage subjects that structure courses and exams." icon={BookmarkIcon} />;
}
