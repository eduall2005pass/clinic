import type { Metadata } from "next";
import QaPageClient from "@/components/auth/QaPageClient";
import { qaSubjects, qaQuestions } from "@/lib/qa";

export const metadata: Metadata = {
  title: "Q&A",
  description:
    "MediSpark Q&A — select a subject, view community questions and teacher answers, and ask your own questions.",
};

/**
 * Q&A is available ONLY to students enrolled in a PAID course.
 * PermissionGate (inside QaPageClient) shows the proper guidance card per
 * access level; every Q&A API request is re-validated server-side.
 */
export default function QaPage() {
  return (
    <main className="flex-1 bg-dark-950">
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <QaPageClient subjects={qaSubjects} questions={qaQuestions} />
      </section>
    </main>
  );
}
