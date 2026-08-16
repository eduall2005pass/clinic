"use client";

import { useState } from "react";
import type { QaQuestion, QaSubject } from "@/lib/qa";

type NewQuestion = Omit<QaQuestion, "id" | "createdAt" | "status">;

export default function QaAskForm({
  subjects,
  initialSubjectId,
  onSubmit,
  onClose,
}: {
  subjects: QaSubject[];
  initialSubjectId?: string;
  onSubmit: (question: NewQuestion) => void;
  onClose: () => void;
}) {
  const [subjectId, setSubjectId] = useState(initialSubjectId ?? "");
  const [text, setText] = useState("");
  const [pictureName, setPictureName] = useState("");
  const [audioName, setAudioName] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = subjectId !== "" && text.trim() !== "";

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    onSubmit({
      subjectId,
      studentName: "You",
      studentAvatar: "/avatars/student.svg",
      text: text.trim(),
      hasPicture: pictureName !== "",
      hasAudio: audioName !== "",
      answer: undefined,
    });

    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="rounded-2xl border border-primary-600/30 bg-primary-600/10 p-6 text-center">
        <p className="font-semibold text-primary-300">
          Your question has been submitted.
        </p>
        <p className="mt-1 text-sm text-primary-200/70">
          You will be notified when a teacher answers it.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-primary-900/40 transition hover:bg-primary-700"
        >
          Back to Questions
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-ink/10 bg-dark-900 p-6 shadow-lg shadow-black/20 sm:p-8"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-heading">Ask a Question</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close question form"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-ink/10 hover:text-heading"
        >
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <label className="mt-6 block">
        <span className="text-xs font-bold uppercase tracking-widest text-neutral-500">
          Subject
        </span>
        <select
          value={subjectId}
          onChange={(event) => setSubjectId(event.target.value)}
          className="mt-2 w-full rounded-xl border border-ink/10 bg-dark-850 px-4 py-2.5 text-sm font-semibold text-heading outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
        >
          <option value="">Select a subject</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
            </option>
          ))}
        </select>
      </label>

      <label className="mt-5 block">
        <span className="text-xs font-bold uppercase tracking-widest text-neutral-500">
          Your Question
        </span>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={4}
          placeholder="Type your question here..."
          className="mt-2 w-full resize-none rounded-xl border border-ink/10 bg-dark-850 px-4 py-3 text-sm text-heading outline-none transition placeholder:text-neutral-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
        />
      </label>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block cursor-pointer rounded-xl border border-dashed border-ink/15 bg-ink/5 p-4 text-center transition hover:border-primary-500/60">
          <span className="block text-sm font-semibold text-neutral-300">
            Picture Upload
          </span>
          <span className="mt-1 block text-xs text-neutral-500">
            {pictureName || "Attach a picture"}
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={(event) =>
              setPictureName(event.target.files?.[0]?.name ?? "")
            }
            className="hidden"
          />
        </label>

        <label className="block cursor-pointer rounded-xl border border-dashed border-ink/15 bg-ink/5 p-4 text-center transition hover:border-primary-500/60">
          <span className="block text-sm font-semibold text-neutral-300">
            Audio Upload
          </span>
          <span className="mt-1 block text-xs text-neutral-500">
            {audioName || "Attach an audio recording"}
          </span>
          <input
            type="file"
            accept="audio/*"
            onChange={(event) =>
              setAudioName(event.target.files?.[0]?.name ?? "")
            }
            className="hidden"
          />
        </label>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          disabled={!canSubmit}
          className="flex-1 rounded-xl bg-primary-600 px-6 py-3 font-semibold text-white shadow-lg shadow-primary-900/40 transition hover:bg-primary-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:border disabled:border-ink/10 disabled:bg-dark-800 disabled:text-neutral-500 disabled:shadow-none"
        >
          Submit Question
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-ink/15 bg-ink/5 px-6 py-3 font-semibold text-neutral-300 transition hover:border-primary-500/60 hover:text-primary-400"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}