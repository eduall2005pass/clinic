"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";

/**
 * Centered Access Permission Card — shown when a registered student without
 * an enrolled course clicks a course-dependent dashboard section. Dismissing
 * it keeps the user logged in on the dashboard; nothing else changes.
 */
export default function AccessPermissionModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  // Close on Escape + lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

    // Portal to <body>: ancestor transforms break position:fixed on desktop.
  const [portalMounted, setPortalMounted] = useState(false);
  useEffect(() => {
    setPortalMounted(true);
    return () => setPortalMounted(false);
  }, []);
  if (!portalMounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Access permission required"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-3xl border border-ink/10 bg-dark-900 p-7 text-center shadow-2xl shadow-black/50 sm:p-9"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Close icon */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-full bg-dark-800 p-2 text-neutral-400 transition hover:text-heading"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Lock icon */}
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600/15 text-primary-400">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7">
            <rect x="4" y="11" width="16" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" strokeLinecap="round" />
            <circle cx="12" cy="16" r="1.5" fill="currentColor" stroke="none" />
          </svg>
        </span>

        <h2 className="mt-5 flex items-center justify-center gap-2 text-xl font-extrabold text-heading">
          <span aria-hidden="true">🔒</span>
          Access Permission Required
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-neutral-400">
          This section is available only after you enroll in a course. Please
          enroll in a course to access this feature.
        </p>

        <Link
          href="/courses"
          className="mt-6 block rounded-xl bg-primary-600 px-6 py-3 font-semibold text-white shadow-lg shadow-primary-900/40 transition hover:bg-primary-700 active:scale-[0.98]"
          onClick={onClose}
        >
          Explore Courses
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full rounded-xl border border-ink/15 bg-ink/5 px-6 py-2.5 text-sm font-semibold text-heading transition hover:border-primary-500/60 hover:bg-ink/10"
        >
          Close
        </button>
      </div>
    </div>,
  document.body);
}
