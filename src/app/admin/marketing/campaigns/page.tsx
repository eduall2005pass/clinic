import type { Metadata } from "next";
import PromotionManager from "@/components/admin/PromotionManager";

export const metadata: Metadata = {
  title: "Campaigns — MediSpark Admin",
  description: "Manage marketing campaigns shown on the website.",
};

export default function CampaignsPage() {
  return (
    <PromotionManager
      kind="campaign"
      loadingLabel="Loading campaigns…"
      heading="Campaigns"
      description="Run marketing campaigns with links, start/end dates and active status. Only active campaigns within their date window appear on the live website."
    />
  );
}
