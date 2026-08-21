import type { Metadata } from "next";
import AdminCategoryPage from "@/components/admin/AdminCategoryPage";
import { adminCategories } from "@/lib/admin-nav";

export const metadata: Metadata = {
  title: "System Management — MediSpark Admin",
  description: "Manage system-level settings, storage, cache, backup and logs.",
};

const category = adminCategories.find((c) => c.href === "/admin/system")!;

export default function SystemManagementPage() {
  return <AdminCategoryPage category={category} />;
}
