"use client";

import { useMemo, useState } from "react";
import type { QaQuestion, QaSubject } from "@/lib/qa";
import { getSubject, getQuestionsBySubject } from "@/lib/qa";
import QaSubjectPicker from "@/components/QaSubjectPicker";
import QaQuestionItem from "@/components/QaQuestionItem";
import QaAskForm from "@/components/QaAskForm";

type NewQuestion = Omit<QaQuestion, "id" | "createdAt" | "status">;

export default function QaExplorer({
  subjects,
  questions,
}: {
  subjects: QaSubject[];
  questions: QaQuestion[];
}) {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(
    null
  );
  const [askOpen, setAskOpen] = useState(false);
  const [localQuestions, setLocalQuestions] =
    useState<QaQuestion[]>(questions);

  const questionCounts = useMemo(
    () =>
      subjects.reduce<Record<string, number>>((counts, subject) => {
        counts[subject.id] = getQuestionsBySubject(subject.id).length;
        return counts;
      }, {}),
    [subjects]
  );

  const selectedSubject = selectedSubjectId
    ? getSubject(selectedSubjectId)
    : undefined;

  const visibleQuestions = selectedSubjectId
    ? localQuestions.filter(
        (question) => question.subjectId === selectedSubjectId
      )
    : [];

  const handleAskSubmit = (question: NewQuestion) => {
    setLocalQuestions((current) => [
      {
        ...question,
        id: `local-${Date.now()}`,
        createdAt: new Date().toLocaleString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }),
        status: "unanswered",
      },
      ...current,
    ]);
  };

  const closeAsk = () => {
    setAskOpen(false);
  };

  return (
    <div>
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {selectedSubject ? (
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-extrabold text-dark-900">
                {selectedSubject.name}
              </h2>
              <button
                type="button"
                onClick={() => setSelectedSubjectId(null)}
                className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-500 transition hover:border-primary-500 hover:text-primary-600"
              >
                Change Subject
              </button>
            </div>
          ) : (
            <p className="text-sm font-medium text-neutral-500">
              Select a subject to browse its questions.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => setAskOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-primary-900/20 transition hover:bg-primary-700"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Ask a Question
        </button>
      </div>

      {askOpen && (
        <div className="mb-10">
          <QaAskForm
            subjects={subjects}
            initialSubjectId={selectedSubjectId ?? undefined}
            onSubmit={handleAskSubmit}
            onClose={closeAsk}
          />
        </div>
      )}

      {!selectedSubject ? (
        <QaSubjectPicker
          subjects={subjects}
          questionCounts={questionCounts}
          onSelect={(subjectId) => {
            setSelectedSubjectId(subjectId);
            setAskOpen(false);
          }}
        />
      ) : visibleQuestions.length > 0 ? (
        <div className="flex flex-col gap-6">
          {visibleQuestions.map((question) => (
            <QaQuestionItem key={question.id} question={question} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-12 text-center">
          <p className="font-semibold text-dark-900">No questions yet</p>
          <p className="mt-1 text-sm text-neutral-500">
            Be the first to ask a question in {selectedSubject.name}.
          </p>
        </div>
      )}
    </div>
  );
}