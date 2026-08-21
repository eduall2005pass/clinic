import type { Metadata } from "next";
import AdminCategoryPage from "@/components/admin/AdminCategoryPage";
import { adminCategories } from "@/lib/admin-nav";

export const metadata: Metadata = {
  title: "Administration Management — MediSpark Admin",
  description: "Manage admins, permissions, security and activity logs.",
};

const category = adminCategories.find((c) => c.href === "/admin/administration")!;

export default function AdministrationManagementPage() {
  return <AdminCategoryPage category={category} />;
}
