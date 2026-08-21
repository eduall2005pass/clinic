import type { Metadata } from "next";
import AdminPlaceholder from "@/components/admin/AdminPlaceholder";
import { FaqIcon } from "@/components/admin/icons";

export const metadata: Metadata = {
  title: "FAQ Section — MediSpark Admin",
  description: "Manage the questions shown in the homepage FAQ section.",
};

export default function HomepageFaqPage() {
  return <AdminPlaceholder title="FAQ Section" description="Manage the questions shown in the homepage FAQ section." icon={FaqIcon} />;
}
