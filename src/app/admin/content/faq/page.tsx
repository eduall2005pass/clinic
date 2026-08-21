import type { Metadata } from "next";
import AdminPlaceholder from "@/components/admin/AdminPlaceholder";
import { FaqIcon } from "@/components/admin/icons";

export const metadata: Metadata = {
  title: "FAQ — MediSpark Admin",
  description: "Manage FAQ entries shown on the website.",
};

export default function ContentFaqPage() {
  return <AdminPlaceholder title="FAQ" description="Manage FAQ entries shown on the website." icon={FaqIcon} />;
}
