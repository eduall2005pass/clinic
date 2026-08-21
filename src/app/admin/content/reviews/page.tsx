import type { Metadata } from "next";
import AdminPlaceholder from "@/components/admin/AdminPlaceholder";
import { ReviewsIcon } from "@/components/admin/icons";

export const metadata: Metadata = {
  title: "Reviews — MediSpark Admin",
  description: "Moderate and publish student reviews.",
};

export default function ContentReviewsPage() {
  return <AdminPlaceholder title="Reviews" description="Moderate and publish student reviews." icon={ReviewsIcon} />;
}
