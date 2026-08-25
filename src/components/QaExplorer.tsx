"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { QaQuestion, QaSubject } from "@/lib/qa";
import QaSubjectPicker from "@/components/QaSubjectPicker";
import type { SubjectStats } from "@/components/QaSubjectPicker";
import QaQuestionItem from "@/components/QaQuestionItem";
import QaAskForm from "@/components/QaAskForm";
import QaGuideline from "@/components/QaGuideline";
import { useAuth } from "@/lib/auth-context";

export default function QaExplorer({
  subjects,
  questions,
}: {
  subjects: QaSubject[];
  questions: QaQuestion[];
}) {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(
    null
  );
  const [askOpen, setAskOpen] = useState(false);

  const subjectStats = useMemo(
    () =>
      subjects.reduce<Record<string, SubjectStats>>((stats, subject) => {
        if (subject.id === "guideline") {
          stats[subject.id] = { total: null, answered: null };
          return stats;
        }
        const subjectQuestions = questions.filter(
          (question) => question.subjectId === subject.id
        );
        stats[subject.id] = {
          total: subjectQuestions.length,
          answered: subjectQuestions.filter(
            (question) => question.status === "answered"
          ).length,
        };
        return stats;
      }, {}),
    [subjects, questions]
  );

  const selectedSubject =
    selectedSubjectId === "guideline"
      ? { id: "guideline", name: "Guideline", order: 999 }
      : subjects.find((subject) => subject.id === selectedSubjectId);

  const isGuideline = selectedSubjectId === "guideline";

  const visibleQuestions = selectedSubjectId
    ? questions.filter(
        (question) => question.subjectId === selectedSubjectId
      )
    : [];

  // Persist the question to MySQL via /api/qa, then refresh server data.
  const handleAskSubmit = async ({
    subjectId,
    text,
  }: {
    subjectId: string;
    text: string;
  }): Promise<{ ok: boolean; error?: string }> => {
    if (!user) {
      return { ok: false, error: "Sign in to ask a question." };
    }
    try {
      const res = await fetch("/api/qa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({
          subjectId,
          text,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        return { ok: false, error: data?.error ?? "Failed to submit your question." };
      }
      router.refresh();
      return { ok: true };
    } catch {
      return {
        ok: false,
        error: "Network error — could not submit your question.",
      };
    }
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
              <h2 className="text-2xl font-extrabold text-heading">
                {selectedSubject.name}
              </h2>
              <button
                type="button"
                onClick={() => setSelectedSubjectId(null)}
                className="rounded-lg border border-ink/10 bg-ink/5 px-3 py-1.5 text-xs font-semibold text-neutral-400 transition hover:border-primary-500/60 hover:text-primary-400"
              >
                Change Subject
              </button>
            </div>
          ) : (
            <p className="text-sm font-medium text-neutral-400">
              Select a subject to browse its questions.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => setAskOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-primary-900/40 transition hover:bg-primary-700 active:scale-[0.98]"
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
            subjects={subjects.filter(
              (subject) => subject.id !== "guideline"
            )}
            initialSubjectId={selectedSubjectId ?? undefined}
            onSubmit={handleAskSubmit}
            onClose={closeAsk}
          />
        </div>
      )}

      {!selectedSubject ? (
        <QaSubjectPicker
          subjects={subjects}
          stats={subjectStats}
          onSelect={(subjectId) => {
            setSelectedSubjectId(subjectId);
            setAskOpen(false);
          }}
        />
      ) : isGuideline ? (
        <QaGuideline />
      ) : visibleQuestions.length > 0 ? (
        <div className="flex flex-col gap-6">
          {visibleQuestions.map((question) => (
            <QaQuestionItem key={question.id} question={question} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-ink/15 bg-dark-900/60 p-12 text-center">
          <p className="font-semibold text-heading">No questions yet</p>
          <p className="mt-1 text-sm text-neutral-400">
            Be the first to ask a question in {selectedSubject.name}.
          </p>
        </div>
      )}
    </div>
  );
}
