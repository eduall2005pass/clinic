import type { Metadata } from "next";
import FavouriteQaView from "@/components/dashboard/FavouriteQaView";

export const metadata: Metadata = {
  title: "Favourite Q&A",
  description: "Your saved favourite Q&A questions.",
};

export default function Page() {
  return <FavouriteQaView />;
}
