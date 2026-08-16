"use client";

import { useState } from "react";
import Image from "next/image";
import type { QaQuestion } from "@/lib/qa";
import QaAnswer from "@/components/QaAnswer";

function FavouriteButton() {
  const [favourite, setFavourite] = useState(false);

  return (
    <button
      type="button"
      aria-label="Favourite this question"
      aria-pressed={favourite}
      onClick={() => setFavourite((value) => !value)}
      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
        favourite
          ? "border-primary-500 bg-primary-600/15 text-primary-400"
          : "border-ink/10 bg-ink/5 text-neutral-400 hover:border-primary-500/60 hover:text-primary-400"
      }`}
    >
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill={favourite ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
        />
      </svg>
      Favourite
    </button>
  );
}

function AttachmentIndicator({
  label,
  icon,
}: {
  label: string;
  icon: "picture" | "audio";
}) {
  return (
    <span
      title={`Has ${label}`}
      className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-ink/5 px-2.5 py-1 text-[11px] font-semibold text-neutral-400"
    >
      {icon === "picture" ? (
        <svg
          className="h-3.5 w-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A1.5 1.5 0 0021.75 19.5V4.5A1.5 1.5 0 0020.25 3H3.75A1.5 1.5 0 002.25 4.5v15A1.5 1.5 0 003.75 21zM15.75 7.5a.75.75 0 100-1.5.75.75 0 000 1.5z"
          />
        </svg>
      ) : (
        <svg
          className="h-3.5 w-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
          />
        </svg>
      )}
      {label}
    </span>
  );
}

export default function QaQuestionItem({
  question,
}: {
  question: QaQuestion;
}) {
  return (
    <article className="rounded-2xl border border-ink/10 bg-dark-900 p-6 shadow-lg shadow-black/20 transition hover:border-primary-600/50 hover:shadow-primary-900/20">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-ink/10 bg-dark-800">
          <Image
            src={question.studentAvatar}
            alt={question.studentName}
            width={44}
            height={44}
            className="rounded-full"
          />
        </div>
        <div>
          <p className="text-sm font-bold text-heading">
            {question.studentName}
          </p>
          <p className="text-xs text-neutral-500">{question.createdAt}</p>
        </div>
        <span
          className={`ml-auto rounded-full px-3 py-1 text-[11px] font-bold ${
            question.status === "answered"
              ? "bg-emerald-500/15 text-emerald-400"
              : "border border-ink/10 bg-ink/5 text-neutral-400"
          }`}
        >
          {question.status === "answered" ? "Answered" : "Unanswered"}
        </span>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-neutral-300">
        {question.text}
      </p>

      {(question.hasPicture || question.hasAudio) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {question.hasPicture && (
            <AttachmentIndicator label="Picture" icon="picture" />
          )}
          {question.hasAudio && (
            <AttachmentIndicator label="Audio" icon="audio" />
          )}
        </div>
      )}

      <div className="mt-5 flex items-center justify-between border-t border-ink/10 pt-4">
        <FavouriteButton />
        <span className="text-xs text-neutral-500">
          {question.status === "answered"
            ? "Answered by a teacher"
            : "Waiting for a teacher answer"}
        </span>
      </div>

      {question.answer && <QaAnswer answer={question.answer} />}
    </article>
  );
}