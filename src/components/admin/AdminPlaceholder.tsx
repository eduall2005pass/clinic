import Link from "next/link";
import type { ComponentType, SVGProps } from "react";
import { ArrowUpRightIcon } from "@/components/admin/icons";

export default function AdminPlaceholder({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
}) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm transition-colors duration-300 sm:p-12 admin-dark:border-zinc-800 admin-dark:bg-zinc-900">
        <div className="flex flex-col items-center text-center">
          {Icon && (
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-600/15 text-primary-600 transition-colors duration-300 admin-dark:text-primary-500">
              <Icon className="h-8 w-8" />
            </span>
          )}
          <span className="mt-5 rounded-full border border-primary-600/30 bg-primary-600/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary-700 transition-colors duration-300 admin-dark:text-primary-400">
            Coming Soon
          </span>
          <h2 className="mt-4 text-xl font-extrabold text-zinc-900 transition-colors duration-300 sm:text-2xl admin-dark:text-zinc-50">
            {title}
          </h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-500 admin-dark:text-zinc-400">
            {description}
          </p>
          <p className="mt-4 max-w-md rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-3 text-xs leading-relaxed text-zinc-500 transition-colors duration-300 admin-dark:border-zinc-700 admin-dark:bg-zinc-950 admin-dark:text-zinc-400">
            This section is part of the new Website Control Center. The layout
            and navigation are ready — data management will be connected to
            MySQL in an upcoming step, so website content can be controlled
            live from here.
          </p>
          <Link
            href="/admin"
            className="mt-6 inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-800 shadow-sm transition hover:border-primary-500/60 hover:bg-neutral-50 admin-dark:border-zinc-700 admin-dark:bg-zinc-800 admin-dark:text-zinc-100 admin-dark:hover:bg-zinc-700"
          >
            Back to Dashboard
            <ArrowUpRightIcon className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
