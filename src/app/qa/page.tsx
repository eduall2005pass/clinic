import { AccessGate } from "@/components/auth/AccessGuard";
import QaPageClient from "@/components/auth/QaPageClient";
import { qaSubjects, qaQuestions } from "@/lib/qa";

export const metadata = {
  title: "Q&A",
  description:
    "MediSpark Q&A — ask questions and get answers from your teachers.",
};

/**
 * Q&A is available ONLY to students enrolled in a PAID course.
 * Registered (no enrollment) and free-course students are denied here;
 * the gate is enforced again server-side on every Q&A API request.
 */
export default function QaPage() {
  return (
    <main className="flex-1 bg-dark-950">
      <AccessGate
        requirement="paid"
        title="Paid Course Required"
        message="Q&A is available exclusively to students enrolled in a Paid Course. Enroll in a paid course to ask questions and get teacher answers."
        actionLabel="Explore Courses"
        actionHref="/courses"
        loadingLabel="Checking your access..."
        secondaryLabel="Back to Dashboard"
        secondaryHref="/dashboard"
      >
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <QaPageClient subjects={qaSubjects} questions={qaQuestions} />
        </section>
      </AccessGate>
    </main>
  );
}
