import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "Q&A",
  description:
    "MediSpark Q&A — ask questions and get answers from experts and fellow students.",
};

export default function QaPage() {
  return (
    <main className="flex-1 bg-neutral-50">
      <PageHeader
        title="Q&A"
        description="Ask questions about HSC academics and medical admission — get answers from experts and fellow students. The Q&A system will be added in upcoming steps."
      />

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-primary-200 bg-primary-50 p-8 text-center">
          <h2 className="text-xl font-bold text-primary-800">
            Questions and answers are on the way
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-primary-700">
            Soon you will be able to ask questions, share answers, and learn
            from discussions across all HSC subjects and medical admission
            topics.
          </p>
        </div>
      </section>
    </main>
  );
}