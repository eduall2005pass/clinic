"use client";

import { useEffect } from "react";

export default function AdminConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="admin-confirm-title"
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl shadow-black/20 animate-fade-up admin-dark:border-zinc-700 admin-dark:bg-zinc-900"
      >
        <div className="p-6">
          <span
            className={`flex h-11 w-11 items-center justify-center rounded-xl ${
              danger
                ? "bg-red-500/10 text-red-500"
                : "bg-primary-600/10 text-primary-600"
            }`}
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              viewBox="0 0 24 24"
            >
              <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
            </svg>
          </span>
          <h2
            id="admin-confirm-title"
            className="mt-4 text-lg font-extrabold text-zinc-900 admin-dark:text-zinc-50"
          >
            {title}
          </h2>
          {message && (
            <p className="mt-2 text-sm leading-relaxed text-zinc-500 admin-dark:text-zinc-400">
              {message}
            </p>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-neutral-100 px-6 py-4 admin-dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-bold text-zinc-600 transition hover:bg-neutral-50 admin-dark:border-zinc-700 admin-dark:text-zinc-300 admin-dark:hover:bg-zinc-800"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-lg transition active:scale-[0.98] ${
              danger
                ? "bg-red-600 shadow-red-900/30 hover:bg-red-700"
                : "bg-primary-600 shadow-primary-900/30 hover:bg-primary-700"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
