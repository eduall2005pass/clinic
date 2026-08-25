import Link from "next/link";
import type { ReactNode } from "react";

/** Website-styled management card used across all 6 admin hub pages. */
export function ManagementCard({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-2xl border border-ink/10 bg-dark-900 p-5 shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-primary-600/60 hover:shadow-primary-900/30 active:scale-[0.99] sm:p-6"
    >
      {icon && (
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-600/15 text-primary-400 transition group-hover:bg-primary-600 group-hover:text-white">
          {icon}
        </span>
      )}
      <span className="mt-3 block text-base font-extrabold text-heading transition group-hover:text-primary-400">
        {title}
      </span>
      <span className="mt-1 line-clamp-2 flex-1 text-xs leading-relaxed text-neutral-400 sm:text-sm">
        {description}
      </span>
      <span className="mt-4 inline-flex items-center gap-1 self-start text-[11px] font-bold uppercase tracking-wide text-primary-400 transition group-hover:text-primary-300">
        Manage <span aria-hidden="true">→</span>
      </span>
    </Link>
  );
}

export function HubHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header>
      <p className="text-xs font-bold uppercase tracking-widest text-primary-500">
        {eyebrow}
      </p>
      <h1 className="mt-2 text-2xl font-extrabold text-heading sm:text-3xl">
        {title}
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-400">
        {description}
      </p>
    </header>
  );
}

const chevron = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-4 w-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
  </svg>
);

export const CardChevron = () => chevron;
