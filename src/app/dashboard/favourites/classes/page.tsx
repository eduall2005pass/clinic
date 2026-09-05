import type { Metadata } from "next";
import FavouriteClassesView from "@/components/dashboard/FavouriteClassesView";

export const metadata: Metadata = {
  title: "Favourite Classes",
  description: "Your saved favourite classes.",
};

export default function Page() {
  return <FavouriteClassesView />;
}
