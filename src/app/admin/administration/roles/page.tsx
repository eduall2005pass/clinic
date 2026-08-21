import type { Metadata } from "next";
import AdminPlaceholder from "@/components/admin/AdminPlaceholder";
import { RolesIcon } from "@/components/admin/icons";

export const metadata: Metadata = {
  title: "Roles & Permissions — MediSpark Admin",
  description: "Define admin roles and what each role can access.",
};

export default function RolesPermissionsPage() {
  return <AdminPlaceholder title="Roles & Permissions" description="Define admin roles and what each role can access." icon={RolesIcon} />;
}
