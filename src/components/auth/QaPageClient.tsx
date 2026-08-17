"use client";

import QaExplorer from "@/components/QaExplorer";
import type { QaQuestion, QaSubject } from "@/lib/qa";

export default function QaPageClient({
  subjects,
  questions,
}: {
  subjects: QaSubject[];
  questions: QaQuestion[];
}) {
  return <QaExplorer subjects={subjects} questions={questions} />;
}