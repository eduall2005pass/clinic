"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export type PermissionGuidance = {
  title: string;
  message: string;
  actionLabel: string;
  actionHref?: string;
  onAction?: () => void;
  actionPending?: boolean;
  secondaryLabel?: string;
  secondaryHref?: string;
  onClose?: () => void;
};

export function LockIcon({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      <path d="M12 15v2" />
    </svg>
  );
}

export default function PermissionGuidanceCard({
  guidance,
  icon,
}: {
  guidance: PermissionGuidance;
  icon?: ReactNode;
}) {
  const { onClose } = guidance;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label={guidance.title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-ink/10 bg-dark-900 p-8 text-center shadow-2xl shadow-black/40 sm:p-10">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-ink/10 bg-ink/5 text-neutral-400 transition hover:border-primary-500/60 hover:text-heading"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              viewBox="0 0 24 24"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}

        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-600/15 text-primary-500">
          {icon ?? <LockIcon />}
        </span>

        <h2 className="mt-5 text-xl font-extrabold text-heading sm:text-2xl">
          {guidance.title}
        </h2>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-neutral-400">
          {guidance.message}
        </p>

        {guidance.onAction ? (
          <button
            type="button"
            onClick={guidance.onAction}
            disabled={guidance.actionPending}
            className="mt-7 block w-full rounded-xl bg-primary-600 px-6 py-3 font-semibold text-white shadow-lg shadow-primary-900/40 transition hover:bg-primary-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {guidance.actionPending ? "Please wait..." : guidance.actionLabel}
          </button>
        ) : guidance.actionHref ? (
          <Link
            href={guidance.actionHref}
            onClick={onClose}
            className="mt-7 block w-full rounded-xl bg-primary-600 px-6 py-3 font-semibold text-white shadow-lg shadow-primary-900/40 transition hover:bg-primary-700 active:scale-[0.98]"
          >
            {guidance.actionLabel}
          </Link>
        ) : null}

        {guidance.secondaryHref && guidance.secondaryLabel && (
          <Link
            href={guidance.secondaryHref}
            onClick={onClose}
            className="mt-3 block w-full rounded-xl border border-ink/15 bg-ink/5 px-6 py-3 font-semibold text-heading transition hover:border-primary-500/60 hover:bg-ink/10"
          >
            {guidance.secondaryLabel}
          </Link>
        )}
      </div>
    </div>
  );
}
