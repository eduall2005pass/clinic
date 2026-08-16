import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import QaExplorer from "@/components/QaExplorer";
import { qaSubjects, qaQuestions } from "@/lib/qa";

export const metadata: Metadata = {
  title: "Q&A",
  description:
    "MediSpark Q&A — select a subject, view community questions and teacher answers, and ask your own questions.",
};

export default function QaPage() {
  return (
    <main className="flex-1 bg-neutral-50">
      <PageHeader
        title="Q&A"
        description="Select a subject to browse community questions and teacher answers, or ask your own question with text, picture and audio attachments."
      />

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <QaExplorer subjects={qaSubjects} questions={qaQuestions} />
      </section>
    </main>
  );
}