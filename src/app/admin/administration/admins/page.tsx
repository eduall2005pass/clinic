import type { Metadata } from "next";
import AdminPlaceholder from "@/components/admin/AdminPlaceholder";
import { UserShieldIcon } from "@/components/admin/icons";

export const metadata: Metadata = {
  title: "Admin Management — MediSpark Admin",
  description: "Add or remove admin accounts for the panel.",
};

export default function AdminManagementPage() {
  return <AdminPlaceholder title="Admin Management" description="Add or remove admin accounts for the panel." icon={UserShieldIcon} />;
}
