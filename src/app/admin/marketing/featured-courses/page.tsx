import type { Metadata } from "next";
import AdminPlaceholder from "@/components/admin/AdminPlaceholder";
import { BookOpenIcon } from "@/components/admin/icons";

export const metadata: Metadata = {
  title: "Featured Courses — MediSpark Admin",
  description: "Choose which courses are featured on the homepage.",
};

export default function FeaturedCoursesPage() {
  return <AdminPlaceholder title="Featured Courses" description="Choose which courses are featured on the homepage." icon={BookOpenIcon} />;
}
