import type { Metadata } from "next";
import AdminCategoryPage from "@/components/admin/AdminCategoryPage";
import { adminCategories } from "@/lib/admin-nav";

export const metadata: Metadata = {
  title: "Website Management — MediSpark Admin",
  description: "Control the complete public MediSpark website.",
};

const category = adminCategories.find((c) => c.href === "/admin/website")!;

export default function WebsiteManagementPage() {
  return <AdminCategoryPage category={category} />;
}
