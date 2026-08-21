import type { Metadata } from "next";
import AdminCategoryPage from "@/components/admin/AdminCategoryPage";
import { adminCategories } from "@/lib/admin-nav";

export const metadata: Metadata = {
  title: "Mentors Management — MediSpark Admin",
  description: "Manage mentor profiles and information.",
};

const category = adminCategories.find((c) => c.href === "/admin/mentors")!;

export default function MentorsManagementPage() {
  return <AdminCategoryPage category={category} />;
}
