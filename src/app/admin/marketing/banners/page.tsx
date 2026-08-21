import type { Metadata } from "next";
import AdminPlaceholder from "@/components/admin/AdminPlaceholder";
import { HeroImageIcon } from "@/components/admin/icons";

export const metadata: Metadata = {
  title: "Promotional Banners — MediSpark Admin",
  description: "Manage promotional banners shown on the live website.",
};

export default function PromotionalBannersPage() {
  return <AdminPlaceholder title="Promotional Banners" description="Manage promotional banners shown on the live website." icon={HeroImageIcon} />;
}
