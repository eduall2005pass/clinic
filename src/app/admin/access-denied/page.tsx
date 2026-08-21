import Link from "next/link";
import { AdminBackButton } from "@/components/admin/AdminPageHeader";

export const metadata = { title: "Access Denied" };

export default function AdminAccessDeniedPage() {
  return (
    <section className="mx-auto flex max-w-xl flex-col items-center px-4 py-20 text-center sm:px-6">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
        <svg
          className="h-8 w-8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          viewBox="0 0 24 24"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </span>
      <h1 className="mt-6 text-2xl font-extrabold text-zinc-900 admin-dark:text-zinc-50">
        Access Denied
      </h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-500 admin-dark:text-zinc-400">
        You do not have permission to view this page. This area is restricted
        to authorized MediSpark administrators.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <AdminBackButton fallbackHref="/admin" />
        <Link
          href="/admin"
          className="rounded-xl bg-primary-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-primary-900/30 transition hover:bg-primary-700 active:scale-[0.98]"
        >
          Back to Admin Home
        </Link>
      </div>
    </section>
  );
}
