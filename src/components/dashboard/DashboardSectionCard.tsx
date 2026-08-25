import Link from "next/link";
import type { DashboardSection } from "@/lib/dashboard";

export default function DashboardSectionCard({
  section,
  wide = false,
  locked = false,
  onLockedClick,
}: {
  section: DashboardSection;
  /** Full-row horizontal layout (icon left, content right). */
  wide?: boolean;
  /** True when the student has no enrollment and this section needs one. */
  locked?: boolean;
  onLockedClick?: () => void;
}) {
  if (wide) {
    return (
      <Link
        href={section.href}
        onClick={locked ? (event) => {
          event.preventDefault();
          onLockedClick?.();
        } : undefined}
        aria-disabled={locked || undefined}
        className="group relative col-span-full flex w-full items-center gap-4 rounded-2xl border border-primary-600/40 bg-gradient-to-r from-primary-600/10 via-dark-900 to-dark-900 p-6 text-left shadow-xl shadow-black/30 ring-1 ring-primary-600/20 transition duration-300 hover:-translate-y-1 hover:border-primary-500/70 hover:shadow-primary-900/40 hover:ring-primary-500/40 active:scale-[0.99] sm:gap-5 sm:p-7"
      >
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-600/20 text-primary-400 shadow-md shadow-primary-900/30 transition group-hover:bg-primary-600 group-hover:text-white sm:h-16 sm:w-16">
          {section.icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-extrabold leading-snug text-heading transition group-hover:text-primary-300 sm:text-lg">
            {section.title}
          </span>
          <span className="mt-1 block text-xs leading-relaxed text-neutral-300 sm:text-sm">
            {section.description}
          </span>
        </span>
        {locked && (
          <span
            aria-label="Enrollment required"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-dark-850 text-neutral-500"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5">
              <rect x="4" y="11" width="16" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" strokeLinecap="round" />
            </svg>
          </span>
        )}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-4 w-4 shrink-0 text-neutral-500 transition group-hover:translate-x-1 group-hover:text-primary-400">
          <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
        </svg>
      </Link>
    );
  }

  return (
    <Link
      href={section.href}
      onClick={locked ? (event) => {
        event.preventDefault();
        onLockedClick?.();
      } : undefined}
      aria-disabled={locked || undefined}
      className="group relative flex flex-col items-center rounded-2xl border border-ink/10 bg-dark-900 p-5 text-center shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-primary-600/60 hover:shadow-primary-900/30 active:scale-[0.98] sm:p-6"
    >
      {locked && (
        <span
          aria-label="Enrollment required"
          className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-lg bg-dark-850 text-neutral-500"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5">
            <rect x="4" y="11" width="16" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" strokeLinecap="round" />
          </svg>
        </span>
      )}
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-600/15 text-primary-500 transition group-hover:bg-primary-600 group-hover:text-heading group-hover:shadow-md group-hover:shadow-primary-900/50 sm:h-14 sm:w-14">
        {section.icon}
      </span>
      <h3 className="mt-4 text-sm font-bold leading-snug text-heading transition group-hover:text-primary-400 sm:text-base">
        {section.title}
      </h3>
      <p className="mt-1.5 text-xs leading-relaxed text-neutral-400 sm:text-sm">
        {section.description}
      </p>
    </Link>
  );
}
