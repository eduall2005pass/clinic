import type { Metadata } from "next";
import AdminCategoryPage from "@/components/admin/AdminCategoryPage";
import { adminCategories } from "@/lib/admin-nav";

export const metadata: Metadata = {
  title: "Courses Management — MediSpark Admin",
  description: "Manage courses, subjects, chapters, classes and pricing.",
};

const category = adminCategories.find((c) => c.href === "/admin/courses")!;

export default function CoursesManagementPage() {
  return <AdminCategoryPage category={category} />;
}
