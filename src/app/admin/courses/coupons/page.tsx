import type { Metadata } from "next";
import AdminPlaceholder from "@/components/admin/AdminPlaceholder";
import { TicketIcon } from "@/components/admin/icons";

export const metadata: Metadata = {
  title: "Coupons — MediSpark Admin",
  description: "Create and manage discount coupons for courses.",
};

export default function CourseCouponsPage() {
  return <AdminPlaceholder title="Coupons" description="Create and manage discount coupons for courses." icon={TicketIcon} />;
}
