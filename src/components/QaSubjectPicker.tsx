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
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-500">
          Select a Subject
        </p>
        <h2 className="mt-3 text-2xl font-extrabold text-heading sm:text-3xl">
          Choose a subject to see its questions
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-neutral-400">
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
            className="group flex flex-col rounded-2xl border border-ink/10 bg-dark-900 p-6 text-left shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-primary-600/60 hover:shadow-primary-900/30"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-800 text-lg font-extrabold text-white shadow-md shadow-primary-900/20 transition group-hover:shadow-primary-800/50">
              {subject.name.charAt(0)}
            </span>
            <h3 className="mt-4 font-bold text-heading transition group-hover:text-primary-400">
              {subject.name}
            </h3>
            <p className="mt-1 text-sm text-neutral-400">
              {questionCounts[subject.id] ?? 0} question
              {(questionCounts[subject.id] ?? 0) === 1 ? "" : "s"}
            </p>
            <span className="mt-4 inline-block text-sm font-semibold text-primary-500 transition group-hover:text-primary-400">
              View Questions →
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}