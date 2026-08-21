import type { Metadata } from "next";
import AdminCategoryPage from "@/components/admin/AdminCategoryPage";
import { adminCategories } from "@/lib/admin-nav";

export const metadata: Metadata = {
  title: "Content Management — MediSpark Admin",
  description: "Manage reviews, FAQ, notifications, announcements and media.",
};

const category = adminCategories.find((c) => c.href === "/admin/content")!;

export default function ContentManagementPage() {
  return <AdminCategoryPage category={category} />;
}
