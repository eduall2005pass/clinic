"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { findActiveAdminNav } from "@/lib/admin-nav";

export function AdminBreadcrumbs({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  const active = findActiveAdminNav(pathname);

  if (active.breadcrumbs.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-zinc-500">
        {active.breadcrumbs.slice(0, -1).map((crumb, index) => (
          <li key={crumb.href + index} className="flex items-center gap-1.5">
            <Link href={crumb.href} className="transition hover:text-primary-400">
              {crumb.label}
            </Link>
            <span aria-hidden className="text-zinc-400">/</span>
          </li>
        ))}
        <li aria-current="page" className="text-zinc-700 admin-dark:text-zinc-300">
          {active.breadcrumbs[active.breadcrumbs.length - 1].label}
        </li>
      </ol>
    </nav>
  );
}

export function AdminBackButton({
  label = "Back",
  fallbackHref = "/admin",
}: {
  label?: string;
  fallbackHref?: string;
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push(fallbackHref);
      }}
      className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-bold text-zinc-600 shadow-sm transition hover:border-primary-500/50 hover:text-primary-600 admin-dark:border-zinc-700 admin-dark:bg-zinc-900 admin-dark:text-zinc-300 admin-dark:hover:text-primary-400"
    >
      <svg
        className="h-3.5 w-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        viewBox="0 0 24 24"
      >
        <path d="m15 18-6-6 6-6" />
      </svg>
      {label}
    </button>
  );
}

export default function AdminPageHeader({
  title,
  description,
  back = true,
}: {
  title: string;
  description?: string;
  back?: boolean;
}) {
  return (
    <header className="animate-fade-up">
      <AdminBreadcrumbs />
      <div className="mt-3 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 transition-colors duration-300 sm:text-3xl admin-dark:text-zinc-50">
            {title}
          </h1>
          {description && (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500 transition-colors duration-300 admin-dark:text-zinc-400">
              {description}
            </p>
          )}
        </div>
        {back && (
          <div className="shrink-0 pt-1">
            <AdminBackButton />
          </div>
        )}
      </div>
    </header>
  );
}
