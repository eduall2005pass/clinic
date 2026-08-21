import type { Metadata } from "next";
import AdminPlaceholder from "@/components/admin/AdminPlaceholder";
import { TagIcon } from "@/components/admin/icons";

export const metadata: Metadata = {
  title: "Categories — MediSpark Admin",
  description: "Organize courses into categories for the website.",
};

export default function CourseCategoriesPage() {
  return <AdminPlaceholder title="Categories" description="Organize courses into categories for the website." icon={TagIcon} />;
}
