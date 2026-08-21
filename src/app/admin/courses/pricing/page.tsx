import type { Metadata } from "next";
import AdminPlaceholder from "@/components/admin/AdminPlaceholder";
import { TagIcon } from "@/components/admin/icons";

export const metadata: Metadata = {
  title: "Pricing — MediSpark Admin",
  description: "Set course prices, discounts and payment plans.",
};

export default function CoursePricingPage() {
  return <AdminPlaceholder title="Pricing" description="Set course prices, discounts and payment plans." icon={TagIcon} />;
}
