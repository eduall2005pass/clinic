"use client";

import { useAdminTheme } from "@/components/admin/AdminThemeProvider";

export default function AdminThemeToggle() {
  const { theme, toggleTheme } = useAdminTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="relative flex h-10 w-[4.25rem] shrink-0 items-center rounded-xl border border-neutral-200 bg-neutral-50 p-1 transition-colors duration-300 hover:border-primary-500/60 admin-dark:border-zinc-700 admin-dark:bg-zinc-800 admin-dark:hover:border-primary-500/60"
    >
      {/* Sliding indicator */}
      <span
        aria-hidden
        className={`absolute top-1 h-8 w-8 rounded-lg bg-primary-600 shadow-md shadow-primary-900/40 transition-all duration-300 ${
          isDark ? "left-[2.15rem]" : "left-1"
        }`}
      />
      {/* Light icon */}
      <span
        aria-hidden
        className={`relative z-10 flex h-8 w-8 items-center justify-center transition-colors duration-300 ${
          isDark ? "text-zinc-500" : "text-white"
        }`}
      >
        <svg
          className="h-4.5 w-4.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          viewBox="0 0 24 24"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </svg>
      </span>
      {/* Dark icon */}
      <span
        aria-hidden
        className={`relative z-10 flex h-8 w-8 items-center justify-center transition-colors duration-300 ${
          isDark ? "text-white" : "text-zinc-500"
        }`}
      >
        <svg
          className="h-4.5 w-4.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          viewBox="0 0 24 24"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
        </svg>
      </span>
    </button>
  );
}
