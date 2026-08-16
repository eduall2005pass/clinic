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
    <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div className="h-20 bg-gradient-to-r from-primary-600 to-primary-800" />
      <div className="flex flex-col gap-5 px-6 pb-6 pt-0 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="relative -mt-8 h-20 w-20 overflow-hidden rounded-xl border-4 border-white bg-neutral-100 shadow-md">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={name}
                className="h-full w-full object-cover"
              />
            ) : (
              <svg
                className="h-full w-full p-4 text-neutral-300"
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
            <h2 className="text-lg font-bold text-dark-900">{name}</h2>
            <div className="mt-1 flex items-center gap-2">
              <p className="text-sm font-medium text-neutral-500">
                ID: {studentId}
              </p>
              <button
                type="button"
                onClick={copyStudentId}
                className="rounded-md border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-xs font-semibold text-neutral-600 transition hover:border-primary-500 hover:text-primary-600"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        </div>

        <Link
          href="/dashboard/notifications"
          className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-primary-600 px-4 py-2.5 text-sm font-semibold text-primary-600 transition hover:bg-primary-600 hover:text-white"
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