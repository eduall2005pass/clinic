import type { Metadata } from "next";
import AdminCategoryPage from "@/components/admin/AdminCategoryPage";
import { adminCategories } from "@/lib/admin-nav";

export const metadata: Metadata = {
  title: "Exams Management — MediSpark Admin",
  description: "Manage public exams, enrolled exams, questions and results.",
};

const category = adminCategories.find((c) => c.href === "/admin/exams")!;

export default function ExamsManagementPage() {
  return <AdminCategoryPage category={category} />;
}
