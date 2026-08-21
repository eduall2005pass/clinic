import type { Metadata } from "next";
import AdminPlaceholder from "@/components/admin/AdminPlaceholder";
import { SeoIcon } from "@/components/admin/icons";

export const metadata: Metadata = {
  title: "SEO Settings — MediSpark Admin",
  description: "Control website meta titles, descriptions and search engine settings.",
};

export default function SeoSettingsPage() {
  return <AdminPlaceholder title="SEO Settings" description="Control website meta titles, descriptions and search engine settings." icon={SeoIcon} />;
}
