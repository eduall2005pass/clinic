"use client";

import { useState } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import { loginHref } from "@/lib/nav-links";
import { useAuth } from "@/lib/auth-context";

export default function Navbar() {
  const { user } = useAuth();
  const actionHref = user ? "/dashboard" : loginHref;
  const actionLabel = user ? "Dashboard" : "Login";
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-ink/10 bg-dark-950/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="relative flex w-1/3 max-w-[384px] shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Menu"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition ${
              menuOpen
                ? "border-primary-500/50 bg-primary-500/10 text-heading"
                : "border-ink/10 bg-ink/5 text-neutral-300 hover:border-primary-500/50 hover:bg-primary-500/10 hover:text-heading"
            }`}
          >
            <svg
              className="h-5 w-5"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="5" r="1.8" />
              <circle cx="12" cy="12" r="1.8" />
              <circle cx="12" cy="19" r="1.8" />
            </svg>
          </button>

          <Link href="/" className="flex min-w-0 flex-1 transition-opacity hover:opacity-90">
            <Logo size="large" />
          </Link>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setMenuOpen(false)}
                aria-hidden="true"
              />
              <div
                role="menu"
                aria-label="Menu"
                className="absolute left-0 top-full z-50 mt-2 min-w-52 rounded-xl border border-ink/10 bg-dark-950/95 p-2 shadow-2xl shadow-black/40 backdrop-blur"
              />
            </>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <ThemeToggle />

          <Link
            href="/dashboard/notifications"
            aria-label="Notifications"
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-ink/10 bg-ink/5 text-neutral-300 transition hover:border-primary-500/50 hover:bg-primary-500/10 hover:text-heading"
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
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary-500" />
          </Link>

          <Link
            href={actionHref}
            className="flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-900/40 transition hover:bg-primary-700 active:scale-[0.98] sm:px-4"
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
            <span>{actionLabel}</span>
          </Link>
        </div>
      </nav>
    </header>
  );
}