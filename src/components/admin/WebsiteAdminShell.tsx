"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useAdminGate } from "@/components/admin/admin-ui";
import { AccessLoading } from "@/components/auth/AccessGuard";
import AdminToastProvider from "@/components/admin/AdminToastProvider";
import ThemeToggle from "@/components/ThemeToggle";

/**
 * Website-styled Admin shell — same header/hamburger pattern as the Main
 * Website, with EXACTLY 6 navigation options. Every option opens a
 * dedicated management page that follows the matching website flow.
 */
const ADMIN_NAV = [
  { label: "Homepage", href: "/admin" },
  { label: "Website Information", href: "/admin/website-information" },
  { label: "Enrollment Control", href: "/admin/enrollment-control" },
  { label: "Home Control", href: "/admin/home-control" },
  { label: "Course Control", href: "/admin/course-control" },
  { label: "Course Content Control", href: "/admin/course-content-control" },
  { label: "Public Exam Control", href: "/admin/public-exam-control" },
  { label: "Q&A Control", href: "/admin/qa-control" },
  { label: "Dashboard Control", href: "/admin/dashboard-control" },
  { label: "Student Control", href: "/admin/student-control" },
  { label: "Result Control", href: "/admin/result-control" },
  { label: "Notification Control", href: "/admin/notification-control" },
  { label: "Admin Center", href: "/admin/admin-center" },
] as const;

export default function WebsiteAdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminToastProvider>
      <WebsiteAdminShellInner>{children}</WebsiteAdminShellInner>
    </AdminToastProvider>
  );
}

function WebsiteAdminShellInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const gate = useAdminGate();
  const { user, logout: signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);


  if (!gate.ready) {
    return gate.denied ? (
      <main className="flex min-h-screen items-center justify-center bg-dark-950 px-4">
        <div className="max-w-md rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-8 text-center">
          <p className="font-bold text-yellow-300">Administrators only</p>
          <p className="mt-1 text-sm text-yellow-200/70">
            The Admin Panel is restricted to authorized administrators.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-xl bg-primary-600 px-6 py-3 font-semibold text-white transition hover:bg-primary-700"
          >
            Back to Website
          </Link>
        </div>
      </main>
    ) : (
      <AccessLoading label="Checking administrator access…" />
    );
  }

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  async function handleLogout() {
    try {
      if (user) {
        const token = await user.getIdToken();
        await fetch("/api/admin/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
      // Always sign out even if the log call fails.
    }
    await signOut();
    router.replace("/");
  }

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-dark-950">
      {/* Site-style sticky header */}
      <header className="sticky top-0 z-50 border-b border-ink/10 bg-dark-950/90 backdrop-blur">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-3 sm:px-6 lg:gap-3">
          <div className="flex items-center gap-3">
            {/* Hamburger — exactly 6 options inside */}
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-ink/10 bg-ink/5 text-neutral-300 transition hover:border-primary-500/50 hover:text-heading lg:hidden"
            >
              {menuOpen ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" strokeLinecap="round">
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" strokeLinecap="round">
                  <path d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
            <Link href="/admin" aria-label="MediSpark Admin">
              <span className="whitespace-nowrap text-base font-extrabold tracking-tight text-heading xl:text-lg">
                Medi<span className="text-primary-500">Spark</span>
                <span className="ml-2 rounded-md border border-primary-500/40 bg-primary-600/10 px-2 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wider text-primary-400">
                  Admin
                </span>
              </span>
            </Link>
          </div>

          {/* Desktop nav — exactly 6 options */}
          <ul className="hidden items-center gap-1 lg:flex">
            {ADMIN_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={`rounded-lg px-2.5 py-2 text-[13px] font-semibold transition xl:px-3.5 xl:text-sm ${
                    isActive(item.href)
                      ? "bg-primary-600/15 text-primary-300"
                      : "text-neutral-400 hover:text-heading"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <Link
              href="/"
              className="hidden whitespace-nowrap rounded-xl border border-ink/15 bg-ink/5 px-3 py-2 text-[13px] font-semibold text-heading transition hover:border-primary-500/60 sm:inline-block xl:px-3.5 xl:text-sm"
            >
              View Website
            </Link>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="whitespace-nowrap rounded-xl bg-primary-600 px-3 py-2 text-[13px] font-semibold text-white shadow-md shadow-primary-900/40 transition hover:bg-primary-700 active:scale-[0.98] xl:px-3.5 xl:text-sm"
            >
              Logout
            </button>
          </div>
        </nav>

        {/* Mobile drawer — exactly the same 6 options */}
        {menuOpen && (
          <div className="border-t border-ink/10 bg-dark-950 lg:hidden">
            <ul className="mx-auto max-w-7xl space-y-1 px-4 py-3">
              {ADMIN_NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    className={`block rounded-xl px-4 py-3 text-sm font-bold transition ${
                      isActive(item.href)
                        ? "bg-primary-600/15 text-primary-300"
                        : "text-neutral-300 hover:bg-ink/5 hover:text-heading"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/"
                  className="block rounded-xl px-4 py-3 text-sm font-semibold text-neutral-400 hover:text-heading"
                >
                  View Website →
                </Link>
              </li>
            </ul>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-ink/10 bg-dark-950 px-4 py-6 text-center text-xs text-neutral-600 sm:px-6">
        MediSpark Admin Panel — single source of truth for the live website.
      </footer>
    </div>
  );
}
