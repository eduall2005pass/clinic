"use client";

import { useEffect } from "react";

/** Route-level error boundary for the Main Website. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] page render failed:", error);
  }, [error]);

  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-extrabold text-heading">
        Something went wrong
      </h1>
      <p className="mt-2 max-w-md text-sm text-neutral-400">
        An unexpected error occurred while loading this page.
        {error.digest ? ` (ref: ${error.digest})` : ""}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-primary-900/40 transition hover:bg-primary-700"
      >
        Try again
      </button>
    </main>
  );
}
