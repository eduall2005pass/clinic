import type { Metadata } from "next";
import AdminPlaceholder from "@/components/admin/AdminPlaceholder";
import { ReviewsIcon } from "@/components/admin/icons";

export const metadata: Metadata = {
  title: "Reviews Section — MediSpark Admin",
  description: "Manage the reviews shown in the homepage reviews section.",
};

export default function HomepageReviewsPage() {
  return <AdminPlaceholder title="Reviews Section" description="Manage the reviews shown in the homepage reviews section." icon={ReviewsIcon} />;
}
