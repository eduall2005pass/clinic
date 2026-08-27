import type { Metadata } from "next";
import QaPageClient from "@/components/auth/QaPageClient";
import { fetchQaBrowseSubjects, fetchQaQuestions } from "@/lib/qa-store";

export const metadata: Metadata = {
  title: "Q&A",
  description:
    "MediSpark Q&A — select a subject, view community questions and teacher answers, and ask your own questions.",
};

/**
 * Q&A is publicly viewable — every visitor can browse subjects, questions
 * and answers. Only the Ask-a-Question action is gated to paid enrollments.
 * Subjects/questions load live from MySQL so admin changes appear instantly.
 */
export const dynamic = "force-dynamic";

export default async function QaPage() {
  const [dbSubjects, questions] = await Promise.all([
    fetchQaBrowseSubjects(),
    fetchQaQuestions({}),
  ]);
  // Guideline is a built-in static card, not DB-managed.
  const subjects = [
    ...dbSubjects,
    { id: "guideline", name: "Guideline", order: 9999 },
  ];

  return (
    <main className="flex-1 bg-dark-950">
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <QaPageClient subjects={subjects} questions={questions} />
      </section>
    </main>
  );
}
