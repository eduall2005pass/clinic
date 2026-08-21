import type { Metadata } from "next";
import AdminPlaceholder from "@/components/admin/AdminPlaceholder";
import { SettingsIcon } from "@/components/admin/icons";

export const metadata: Metadata = {
  title: "Admin Settings — MediSpark Admin",
  description: "Configure how the admin panel itself works.",
};

export default function AdminSettingsPage() {
  return <AdminPlaceholder title="Admin Settings" description="Configure how the admin panel itself works." icon={SettingsIcon} />;
}
