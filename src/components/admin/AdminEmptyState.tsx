import Link from "next/link";

export default function AdminEmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600/10 text-primary-500">
        {icon ?? (
          <svg
            className="h-7 w-7"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            viewBox="0 0 24 24"
          >
            <path d="M12 3v3" />
            <path d="M12 18v3" />
            <path d="M3 12h3" />
            <path d="M18 12h3" />
            <circle cx="12" cy="12" r="3.5" />
          </svg>
        )}
      </span>
      <h3 className="mt-5 text-lg font-bold text-zinc-900 admin-dark:text-zinc-50">{title}</h3>
      {description && (
        <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-500 admin-dark:text-zinc-400">
          {description}
        </p>
      )}
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="mt-6 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary-900/30 transition hover:bg-primary-700 active:scale-[0.98]"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
