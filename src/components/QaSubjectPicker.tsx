"use client";

import type { ReactNode } from "react";
import type { QaSubject } from "@/lib/qa";

export type SubjectStats = {
  total: number | null;
  answered: number | null;
};

const subjectIcons: Record<string, ReactNode> = {
  biology: (
    <svg
      className="h-6 w-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    >
      <path d="M8.5 3c2.5 3-2.5 6 0 9s-2.5 6 0 9" />
      <path d="M15.5 3c-2.5 3 2.5 6 0 9s2.5 6 0 9" />
      <path d="M5 7.5h3M16 7.5h3M5 16.5h3M16 16.5h3" />
    </svg>
  ),
  chemistry: (
    <svg
      className="h-6 w-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
    </svg>
  ),
  physics: (
    <svg
      className="h-6 w-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    >
      <ellipse cx="12" cy="12" rx="8.5" ry="3.4" />
      <ellipse cx="12" cy="12" rx="8.5" ry="3.4" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="8.5" ry="3.4" transform="rotate(120 12 12)" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  ),
  english: (
    <svg
      className="h-6 w-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  ),
  gk: (
    <svg
      className="h-6 w-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  ),
  guideline: (
    <svg
      className="h-6 w-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
    </svg>
  ),
};

export default function QaSubjectPicker({
  subjects,
  stats,
  onSelect,
}: {
  subjects: QaSubject[];
  stats: Record<string, SubjectStats>;
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

      <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {subjects.map((subject) => {
          const subjectStats = stats[subject.id];
          return (
            <div
              key={subject.id}
              className="group flex min-w-0 flex-col rounded-2xl border border-ink/10 bg-dark-900 p-4 shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-primary-600/60 hover:shadow-primary-900/30 sm:p-5"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-800 text-white shadow-md shadow-primary-900/20 transition group-hover:shadow-primary-800/50">
                {subjectIcons[subject.id]}
              </span>

              <h3 className="mt-4 truncate font-bold text-heading transition group-hover:text-primary-400">
                {subject.name}
              </h3>

              <div className="mt-4 space-y-2">
                <div className="flex min-w-0 items-center justify-between gap-2 rounded-xl border border-ink/10 bg-ink/5 px-3 py-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                    Total Questions
                  </span>
                  <span className="shrink-0 text-sm font-bold text-heading">
                    {subjectStats?.total ?? "—"}
                  </span>
                </div>
                <div className="flex min-w-0 items-center justify-between gap-2 rounded-xl border border-ink/10 bg-ink/5 px-3 py-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                    Answered
                  </span>
                  <span className="shrink-0 text-sm font-bold text-emerald-400">
                    {subjectStats?.answered ?? "—"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onSelect(subject.id)}
                className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-primary-900/30 transition hover:bg-primary-700 active:scale-[0.98]"
              >
                View Questions
                <span aria-hidden="true">→</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
