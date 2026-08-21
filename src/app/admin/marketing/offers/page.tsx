import type { Metadata } from "next";
import AdminPlaceholder from "@/components/admin/AdminPlaceholder";
import { TagIcon } from "@/components/admin/icons";

export const metadata: Metadata = {
  title: "Offers — MediSpark Admin",
  description: "Create and manage special offers for students.",
};

export default function OffersPage() {
  return <AdminPlaceholder title="Offers" description="Create and manage special offers for students." icon={TagIcon} />;
}
