import type { Metadata } from "next";
import FavouriteMaterialsView from "@/components/dashboard/FavouriteMaterialsView";

export const metadata: Metadata = {
  title: "Favourite Materials",
  description: "Your saved favourite materials.",
};

export default function Page() {
  return <FavouriteMaterialsView />;
}
