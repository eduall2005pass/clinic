import type { Metadata } from "next";
import CouponsManager from "@/app/admin/courses/coupons/page";

export const metadata: Metadata = {
  title: "Coupons — MediSpark Admin",
  description: "Create and manage discount coupons for campaigns.",
};

/**
 * Marketing → Coupons reuses the same MySQL-backed coupon manager as
 * Course Control (single source of truth, no duplicate UI).
 */
export default function MarketingCouponsPage() {
  return <CouponsManager />;
}
