import type { Metadata } from "next";
import { AccessGate } from "@/components/auth/AccessGuard";
import FavouritesOverview from "@/components/dashboard/FavouritesOverview";

export const metadata: Metadata = {
  title: "Favourite",
  description: "Your saved favourites — classes, exams, materials and Q&A.",
};

export default function FavouritesPage() {
  return (
    <AccessGate requirement="enrolled" loadingLabel="Loading favourites...">
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <header>
          <h1 className="text-2xl font-extrabold text-heading sm:text-3xl">Favourite</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-neutral-400">
            Your saved learning content — pick a category to view your favourites.
          </p>
        </header>
        <div className="mt-8">
          <FavouritesOverview />
        </div>
      </section>
    </AccessGate>
  );
}