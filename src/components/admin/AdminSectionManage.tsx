"use client";

import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Wraps one homepage section inside the Admin Panel's mirrored Home view.
 * Renders the section EXACTLY as the Main Website renders it, with only a
 * small floating Manage chip linking to its MySQL-backed manager.
 */
export default function AdminSectionManage({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="group relative">
      <Link
        href={href}
        title={`Manage ${label}`}
        className="absolute right-3 top-3 z-40 inline-flex items-center gap-1.5 rounded-lg border border-primary-500/50 bg-dark-950/85 px-2.5 py-1 text-[11px] font-bold text-primary-400 opacity-0 shadow-lg shadow-black/30 backdrop-blur transition hover:border-primary-400 hover:text-primary-300 focus:opacity-100 group-hover:opacity-100 sm:right-5 sm:top-5"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-3 w-3"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.86 4.49a2.1 2.1 0 013 2.97L8.42 18.9l-3.9 1 1-3.9L16.87 4.5z"
          />
        </svg>
        Manage {label}
      </Link>
      {children}
    </div>
  );
}
