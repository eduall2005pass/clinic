import type { Metadata } from "next";
import EnrollmentRequiredSection from "@/components/auth/EnrollmentRequiredSection";

export const metadata: Metadata = {
  title: "Favourite",
  description:
    "Find your saved learning content on MediSpark — your favourites will appear here.",
};

export default function FavouritesPage() {
  return (
    <EnrollmentRequiredSection
      title="Favourite"
      description="Your saved learning content will be shown here. Favourite data will be connected to your account in an upcoming step."
    />
  );
}