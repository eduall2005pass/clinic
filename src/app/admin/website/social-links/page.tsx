import type { Metadata } from "next";
import AdminPlaceholder from "@/components/admin/AdminPlaceholder";
import { ShareIcon } from "@/components/admin/icons";

export const metadata: Metadata = {
  title: "Social Links — MediSpark Admin",
  description: "Manage the social media links shown across the website.",
};

export default function SocialLinksPage() {
  return <AdminPlaceholder title="Social Links" description="Manage the social media links shown across the website." icon={ShareIcon} />;
}
