"use client";

import Link from "next/link";
import AdminGuard from "@/components/admin/AdminGuard";
import { useAuth } from "@/lib/auth-context";

export default function AdminDashboardPage() {
  const { user } = useAuth();

  return (
    <AdminGuard>
      <main className="flex-1 bg-dark-950">
        <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <header className="animate-fade-up">
            <p className="text-xs font-bold uppercase tracking-widest text-primary-500">
              Admin Panel
            </p>
            <h1 className="mt-2 text-3xl font-extrabold text-heading">
              Admin Dashboard
            </h1>
            <p className="mt-2 text-sm text-neutral-400">
              Welcome{user?.displayName ? `, ${user.displayName}` : ""}. Manage
              website content and settings from here.
            </p>
          </header>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <Link
              href="/admin/branding"
              className="group rounded-2xl border border-ink/10 bg-dark-900 p-6 transition hover:border-primary-500/50 hover:bg-primary-500/5"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-600/15 text-primary-500">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  viewBox="0 0 24 24"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="m21 15-5-5L5 21" />
                </svg>
              </span>
              <span className="mt-4 block text-base font-bold text-heading">
                Website Settings
              </span>
              <span className="mt-1 block text-sm text-neutral-400">
                Manage the website logo and hero banner slider.
              </span>
            </Link>

            <Link
              href="/"
              className="group rounded-2xl border border-ink/10 bg-dark-900 p-6 transition hover:border-primary-500/50 hover:bg-primary-500/5"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-600/15 text-primary-500">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  viewBox="0 0 24 24"
                >
                  <path d="M3 9.5 12 4l9 5.5" />
                  <path d="M5 10v10h14V10" />
                  <path d="M9 20v-6h6v6" />
                </svg>
              </span>
              <span className="mt-4 block text-base font-bold text-heading">
                View Website
              </span>
              <span className="mt-1 block text-sm text-neutral-400">
                Open the public MediSpark website as visitors see it.
              </span>
            </Link>
          </div>
        </section>
      </main>
    </AdminGuard>
  );
}