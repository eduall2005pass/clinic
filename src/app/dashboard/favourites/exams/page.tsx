import type { Metadata } from "next";
import FavouriteExamsView from "@/components/dashboard/FavouriteExamsView";

export const metadata: Metadata = {
  title: "Favourite Exams",
  description: "Your saved favourite exams.",
};

export default function Page() {
  return <FavouriteExamsView />;
}
