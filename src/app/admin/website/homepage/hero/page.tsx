import type { Metadata } from "next";
import AdminPlaceholder from "@/components/admin/AdminPlaceholder";
import { HeroImageIcon } from "@/components/admin/icons";

export const metadata: Metadata = {
  title: "Hero Section — MediSpark Admin",
  description: "Update the homepage hero section — headline, subtext and call to action.",
};

export default function HomepageHeroPage() {
  return <AdminPlaceholder title="Hero Section" description="Update the homepage hero section — headline, subtext and call to action." icon={HeroImageIcon} />;
}
