import type { Metadata } from "next";
import AdminPlaceholder from "@/components/admin/AdminPlaceholder";
import { UserShieldIcon } from "@/components/admin/icons";

export const metadata: Metadata = {
  title: "Student Accounts — MediSpark Admin",
  description: "Manage student account status and access.",
};

export default function StudentAccountsPage() {
  return <AdminPlaceholder title="Student Accounts" description="Manage student account status and access." icon={UserShieldIcon} />;
}
