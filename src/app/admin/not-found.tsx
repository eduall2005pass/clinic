import Link from "next/link";
import { AdminBackButton } from "@/components/admin/AdminPageHeader";

export const metadata = { title: "Page Not Found" };

export default function AdminNotFound() {
  return (
    <section className="mx-auto flex max-w-xl flex-col items-center px-4 py-20 text-center sm:px-6">
      <p className="bg-gradient-to-r from-primary-500 to-primary-700 bg-clip-text text-7xl font-extrabold tracking-tight text-transparent">
        404
      </p>
      <h1 className="mt-4 text-2xl font-extrabold text-[#0b1e3a] admin-dark:text-white">
        Page Not Found
      </h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500 admin-dark:text-slate-400">
        The Admin Panel page you are looking for does not exist or has been
        moved.
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
