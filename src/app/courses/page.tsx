import type { Metadata } from "next";
import CourseCatalog from "@/components/CourseCatalog";
import { batches, courses } from "@/lib/courses";

export const metadata: Metadata = {
  title: "Courses",
  description:
    "Browse MediSpark courses by batch and course type — HSC academic subjects and medical admission preparation.",
};

export default function CoursesPage() {
  return (
    <main className="flex-1 bg-dark-950">
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <CourseCatalog batches={batches} courses={courses} />
      </section>
    </main>
  );
}