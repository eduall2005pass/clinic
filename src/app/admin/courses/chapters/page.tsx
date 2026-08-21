import type { Metadata } from "next";
import AdminPlaceholder from "@/components/admin/AdminPlaceholder";
import { ChaptersIcon } from "@/components/admin/icons";

export const metadata: Metadata = {
  title: "Chapters — MediSpark Admin",
  description: "Manage chapters inside each subject.",
};

export default function CourseChaptersPage() {
  return <AdminPlaceholder title="Chapters" description="Manage chapters inside each subject." icon={ChaptersIcon} />;
}
