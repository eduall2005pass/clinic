"use client";

import QaExplorer from "@/components/QaExplorer";
import PermissionGate from "@/components/auth/PermissionGate";
import type { QaQuestion, QaSubject } from "@/lib/qa";

export default function QaPageClient({
  subjects,
  questions,
}: {
  subjects: QaSubject[];
  questions: QaQuestion[];
}) {
  return (
    <PermissionGate requirement="qa" loadingLabel="Loading Q&A...">
      <QaExplorer subjects={subjects} questions={questions} />
    </PermissionGate>
  );
}
