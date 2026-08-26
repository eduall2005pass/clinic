"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Route-level error boundary for the Admin Panel — a failed render never
 * leaves the admin with a blank screen.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin] page render failed:", error);
  }, [error]);

  return (
    <section className="mx-auto flex max-w-xl flex-col items-center px-4 py-20 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/15 text-2xl text-red-400">
        !
      </span>
      <h1 className="mt-5 text-xl font-extrabold text-heading">
        Something went wrong
      </h1>
      <p className="mt-2 break-all text-sm leading-relaxed text-neutral-400">
        {error.message || "The page could not be rendered."}
        {error.digest ? ` (ref: ${error.digest})` : ""}
      </p>
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-primary-900/40 transition hover:bg-primary-700"
        >
          Try again
        </button>
        <Link
          href="/admin"
          className="rounded-xl border border-ink/15 px-5 py-2.5 text-sm font-bold text-heading transition hover:border-[#93c5fd]"
        >
          Back to Admin Home
        </Link>
      </div>
    </section>
  );
}
