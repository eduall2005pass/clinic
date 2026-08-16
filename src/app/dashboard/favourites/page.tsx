import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import SectionPlaceholder from "@/components/dashboard/SectionPlaceholder";

export const metadata: Metadata = {
  title: "Favourite",
  description:
    "Find your saved learning content on MediSpark — your favourites will appear here.",
};

export default function FavouritesPage() {
  return (
    <main className="flex-1 bg-neutral-50">
      <PageHeader
        title="Favourite"
        description="Find your saved learning content."
      />
      <SectionPlaceholder
        title="Favourite"
        description="Your saved learning content will be shown here. Favourite data will be connected to your account in an upcoming step."
      />
    </main>
  );
}