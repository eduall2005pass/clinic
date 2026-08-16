"use client";

import Link from "next/link";
import Logo from "@/components/Logo";
import { loginHref } from "@/lib/nav-links";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-dark-950/90 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="shrink-0">
          <Logo light />
        </Link>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            aria-label="Notifications"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-neutral-300 transition hover:bg-white/10 hover:text-white"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              viewBox="0 0 24 24"
            >
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </button>

          <Link
            href={loginHref}
            className="flex items-center gap-2 rounded-lg bg-primary-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 sm:px-4"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              viewBox="0 0 24 24"
            >
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span>Login</span>
          </Link>
        </div>
      </nav>
    </header>
  );
}