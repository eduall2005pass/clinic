import type { Metadata } from "next";
import QaPageClient from "@/components/auth/QaPageClient";
import { fetchQaSubjects, fetchQaQuestions } from "@/lib/qa-store";

export const metadata: Metadata = {
  title: "Q&A",
  description:
    "MediSpark Q&A — select a subject, view community questions and teacher answers, and ask your own questions.",
};

/**
 * Q&A is available ONLY to students enrolled in a PAID course.
 * PermissionGate (inside QaPageClient) shows the proper guidance card per
 * access level; every Q&A API request is re-validated server-side.
 * Subjects/questions load live from MySQL so admin changes appear instantly.
 */
export const dynamic = "force-dynamic";

export default async function QaPage() {
  const [dbSubjects, questions] = await Promise.all([
    fetchQaSubjects(true),
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
