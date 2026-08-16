"use client";

import { useState } from "react";
import Link from "next/link";

export type StudentProfile = {
  name: string;
  studentId: string;
  avatarUrl?: string;
};

export default function ProfileCard({
  name,
  studentId,
  avatarUrl,
}: StudentProfile) {
  const [copied, setCopied] = useState(false);

  const copyStudentId = async () => {
    try {
      await navigator.clipboard.writeText(studentId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="relative overflow-hidden rounded-2xl border border-ink/10 bg-dark-900 shadow-lg shadow-black/20">
      <div className="pointer-events-none absolute inset-0 bg-medical-cross opacity-50" />
      <div className="relative h-16 bg-gradient-to-r from-primary-700 via-primary-800 to-[#0a0a0a]" />

      <div className="relative flex flex-col gap-5 px-6 pb-6 pt-0 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="relative -mt-7 h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 border-dark-900 bg-dark-800 shadow-lg shadow-black/40">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={name}
                className="h-full w-full object-cover"
              />
            ) : (
              <svg
                className="h-full w-full p-3 text-neutral-500"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21a8 8 0 0 1 16 0" />
              </svg>
            )}
          </div>
          <div>
            <h2 className="text-lg font-bold text-heading">{name}</h2>
            <div className="mt-1.5 flex items-center gap-2">
              <p className="text-sm font-medium text-neutral-400">
                ID: {studentId}
              </p>
              <button
                type="button"
                onClick={copyStudentId}
                className="rounded-md border border-ink/10 bg-ink/5 px-2 py-0.5 text-xs font-semibold text-neutral-300 transition hover:border-primary-500/60 hover:bg-primary-600/15 hover:text-primary-400"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        </div>

        <Link
          href="/dashboard/notifications"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-ink/15 bg-ink/5 px-4 py-2.5 text-sm font-semibold text-heading transition hover:border-primary-500/60 hover:bg-primary-600/15 hover:text-primary-400"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            viewBox="0 0 24 24"
          >
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
          Notifications
        </Link>
      </div>
    </section>
  );
}