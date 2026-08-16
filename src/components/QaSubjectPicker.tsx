"use client";

import type { QaSubject } from "@/lib/qa";

export default function QaSubjectPicker({
  subjects,
  questionCounts,
  onSelect,
}: {
  subjects: QaSubject[];
  questionCounts: Record<string, number>;
  onSelect: (subjectId: string) => void;
}) {
  return (
    <div>
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-primary-600">
          Select a Subject
        </p>
        <h2 className="mt-3 text-2xl font-extrabold text-dark-900 sm:text-3xl">
          Choose a subject to see its questions
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-neutral-500">
          Pick a subject from the list below to view community questions and
          teacher answers for that subject.
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {subjects.map((subject) => (
          <button
            key={subject.id}
            type="button"
            onClick={() => onSelect(subject.id)}
            className="group flex flex-col rounded-2xl border border-neutral-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:border-primary-500 hover:shadow-lg"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-800 text-lg font-extrabold text-white shadow-md shadow-primary-900/20">
              {subject.name.charAt(0)}
            </span>
            <h3 className="mt-4 font-bold text-dark-900 transition group-hover:text-primary-700">
              {subject.name}
            </h3>
            <p className="mt-1 text-sm text-neutral-500">
              {questionCounts[subject.id] ?? 0} question
              {(questionCounts[subject.id] ?? 0) === 1 ? "" : "s"}
            </p>
            <span className="mt-4 inline-block text-sm font-semibold text-primary-600">
              View Questions →
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}