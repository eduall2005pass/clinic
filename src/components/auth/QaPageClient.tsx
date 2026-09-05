"use client";

import QaExplorer from "@/components/QaExplorer";
import type { QaQuestion, QaSubject } from "@/lib/qa";
import type { QaAskCardSettings } from "@/lib/qa-ask-card-settings";

export default function QaPageClient({
  subjects,
  questions,
  askCardSettings,
}: {
  subjects: QaSubject[];
  questions: QaQuestion[];
  askCardSettings?: QaAskCardSettings | null;
}) {
  return <QaExplorer subjects={subjects} questions={questions} askCardSettings={askCardSettings} />;
}
