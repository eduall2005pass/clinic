import type { Metadata } from "next";
import PromotionManager from "@/components/admin/PromotionManager";

export const metadata: Metadata = {
  title: "Offers — MediSpark Admin",
  description: "Manage promotional offers shown on the website.",
};

export default function OffersPage() {
  return (
    <PromotionManager
      kind="offer"
      loadingLabel="Loading offers…"
      heading="Offers"
      description="Create promotional offers with links, start/end dates and active status. Only active offers within their date window appear on the live website."
    />
  );
}
