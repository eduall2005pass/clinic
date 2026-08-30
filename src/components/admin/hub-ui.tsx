import Link from "next/link";
import type { ReactNode } from "react";

/** Premium Navy Smart Card — unified across all admin hubs */
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
      className="group flex flex-col rounded-2xl border border-[#dbeafe] bg-white p-5 shadow-sm shadow-[#0b1e3a]/5 transition-all duration-200 hover:-translate-y-1 hover:border-[#93c5fd] hover:shadow-md hover:shadow-[#0b1e3a]/10 active:scale-[0.99] sm:p-6 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] admin-dark:shadow-black/20 admin-dark:hover:border-[#2f5aa0]"
    >
      {icon && (
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eff6ff] text-[#1a3a78] ring-1 ring-[#dbeafe] transition group-hover:bg-[#1a3a78] group-hover:text-white group-hover:ring-[#1a3a78] admin-dark:bg-[#0f2547] admin-dark:text-[#93c5fd] admin-dark:ring-[#1e3a65] admin-dark:group-hover:bg-[#234e9f] admin-dark:group-hover:text-white">
          {icon}
        </span>
      )}
      <span className="mt-3 block text-base font-extrabold text-[#0b1e3a] transition group-hover:text-[#1a3a78] admin-dark:text-white admin-dark:group-hover:text-[#93c5fd]">
        {title}
      </span>
      <span className="mt-1 line-clamp-2 flex-1 text-xs leading-relaxed text-slate-500 sm:text-sm admin-dark:text-[#8da0c0]">
        {description}
      </span>
      <span className="mt-4 inline-flex items-center gap-1 self-start text-[11px] font-bold uppercase tracking-wide text-[#234e9f] transition group-hover:text-[#1a3a78] admin-dark:text-[#93c5fd] admin-dark:group-hover:text-[#bfdbfe]">
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
      <p className="text-xs font-bold uppercase tracking-widest text-[#234e9f] admin-dark:text-[#93c5fd]">
        {eyebrow}
      </p>
      <h1 className="mt-2 text-2xl font-extrabold text-[#0b1e3a] sm:text-3xl admin-dark:text-white">
        {title}
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500 admin-dark:text-[#8da0c0]">
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
