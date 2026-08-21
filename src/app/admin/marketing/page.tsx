import type { Metadata } from "next";
import AdminCategoryPage from "@/components/admin/AdminCategoryPage";
import { adminCategories } from "@/lib/admin-nav";

export const metadata: Metadata = {
  title: "Marketing Management — MediSpark Admin",
  description: "Manage offers, promotional banners, featured courses and campaigns.",
};

const category = adminCategories.find((c) => c.href === "/admin/marketing")!;

export default function MarketingManagementPage() {
  return <AdminCategoryPage category={category} />;
}
