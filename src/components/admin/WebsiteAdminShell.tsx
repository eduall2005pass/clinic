"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useAdminGate } from "@/components/admin/admin-ui";
import { AccessLoading } from "@/components/auth/AccessGuard";
import AdminToastProvider from "@/components/admin/AdminToastProvider";
import { AdminThemeProvider, useAdminTheme } from "@/components/admin/AdminThemeProvider";
import AdminThemeToggle from "@/components/admin/AdminThemeToggle";

/**
 * Website-styled Admin shell — Premium Navy Blue Smart Theme
 * Deep Navy sidebar/drawer, White/Light-Blue header, cohesive Smart Cards.
 * Every option opens a dedicated management page — functionality unchanged.
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
    <AdminThemeProvider>
      <AdminToastProvider>
        <WebsiteAdminShellInner>{children}</WebsiteAdminShellInner>
      </AdminToastProvider>
    </AdminThemeProvider>
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
  const { theme } = useAdminTheme();

  if (!gate.ready) {
    return gate.denied ? (
      <div data-admin-theme={theme} className="flex min-h-screen items-center justify-center bg-[#f1f5f9] px-4 admin-dark:bg-[#0a162e]">
        <div className="max-w-md rounded-2xl border border-[#dbeafe] bg-white p-8 text-center shadow-lg admin-dark:border-[#1e3a65] admin-dark:bg-[#112544]">
          <p className="font-bold text-[#1a3a78] admin-dark:text-[#93c5fd]">Administrators only</p>
          <p className="mt-1 text-sm text-slate-500 admin-dark:text-[#8da0c0]">
            The Admin Panel is restricted to authorized administrators.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-xl bg-[#1a3a78] px-6 py-3 font-semibold text-white shadow-md transition hover:bg-[#123060] admin-dark:bg-[#234e9f] admin-dark:hover:bg-[#1a3a78]"
          >
            Back to Website
          </Link>
        </div>
      </div>
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
    <div
      data-admin-theme={theme}
      className="flex min-h-screen flex-col overflow-x-hidden bg-[#f1f5f9] admin-dark:bg-[#0a162e]"
    >
      {/* Premium Navy Header — clean white / light-blue surface */}
      <header className="sticky top-0 z-50 border-b border-[#dbeafe] bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 shadow-sm admin-dark:border-[#1e3a65] admin-dark:bg-[#0f2547]/95">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-3 sm:px-6 xl:gap-3">
          <div className="flex items-center gap-3">
            {/* Hamburger — visible on laptop/tablet/mobile (xl:hidden), not on xl+ desktop */}
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#dbeafe] bg-[#f8fbff] text-[#1a3a78] transition hover:border-[#93c5fd] hover:bg-[#eff6ff] focus:outline-none focus:ring-2 focus:ring-[#2f6bce]/20 xl:hidden admin-dark:border-[#1e3a65] admin-dark:bg-[#132a4f] admin-dark:text-[#93c5fd] admin-dark:hover:bg-[#1a3a78]"
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
            <Link href="/admin" aria-label="MediSpark Admin" className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0b1e3a] text-white shadow-md admin-dark:bg-[#234e9f]">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M3 12h18" />
                  <path d="M12 3a13.5 13.5 0 0 1 0 18a13.5 13.5 0 0 1 0-18Z" />
                </svg>
              </span>
              <span className="whitespace-nowrap text-base font-extrabold tracking-tight text-[#0b1e3a] admin-dark:text-white xl:text-lg">
                Medi<span className="text-[#234e9f] admin-dark:text-[#93c5fd]">Spark</span>
                <span className="ml-2 rounded-full border border-[#bfdbfe] bg-[#eff6ff] px-2 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wider text-[#1a3a78] admin-dark:border-[#1e3a65] admin-dark:bg-[#132a4f] admin-dark:text-[#93c5fd]">
                  Admin
                </span>
              </span>
            </Link>
          </div>

          {/* Desktop nav — cohesive navy active highlight (xl+ only) */}
          <ul className="hidden items-center gap-1 xl:flex">
            {ADMIN_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={`rounded-xl px-2.5 py-2 text-[13px] font-semibold transition xl:px-3 xl:text-sm ${
                    isActive(item.href)
                      ? "bg-[#1a3a78] text-white shadow-md shadow-[#0b1e3a]/15 admin-dark:bg-[#234e9f] admin-dark:text-white"
                      : "text-slate-600 hover:bg-[#eff6ff] hover:text-[#1a3a78] admin-dark:text-[#8da0c0] admin-dark:hover:bg-[#132a4f] admin-dark:hover:text-[#93c5fd]"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex shrink-0 items-center gap-2">
            <AdminThemeToggle />
            <Link
              href="/"
              className="hidden whitespace-nowrap rounded-xl border border-[#dbeafe] bg-[#f8fbff] px-3 py-2 text-[13px] font-semibold text-[#1a3a78] transition hover:border-[#93c5fd] hover:bg-[#eff6ff] sm:inline-block xl:px-3.5 xl:text-sm admin-dark:border-[#1e3a65] admin-dark:bg-[#132a4f] admin-dark:text-[#93c5fd] admin-dark:hover:bg-[#1a3a78]"
            >
              View Website
            </Link>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="whitespace-nowrap rounded-xl bg-[#1a3a78] px-3 py-2 text-[13px] font-semibold text-white shadow-md shadow-[#0b1e3a]/20 transition hover:bg-[#123060] active:scale-[0.98] xl:px-3.5 xl:text-sm admin-dark:bg-[#234e9f] admin-dark:hover:bg-[#1a3a78]"
            >
              Logout
            </button>
          </div>
        </nav>

        {/* Mobile/tablet/laptop drawer — Deep Navy with overlay */}
        {menuOpen && (
          <>
            {/* Subtle overlay — clicking closes the drawer */}
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] xl:hidden"
            />
            <div className="relative z-50 border-t border-[#0f2a4d] bg-[#0b1e3a] xl:hidden">
            <ul className="mx-auto max-w-7xl space-y-1 px-4 py-3">
              {ADMIN_NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    className={`block rounded-xl px-4 py-3 text-sm font-semibold transition ${
                      isActive(item.href)
                        ? "bg-[#234e9f] text-white shadow-md"
                        : "text-slate-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/"
                  className="block rounded-xl px-4 py-3 text-sm font-semibold text-[#93c5fd] hover:bg-white/10 hover:text-white"
                >
                  View Website →
                </Link>
              </li>
            </ul>
            </div>
          </>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-[#dbeafe] bg-white px-4 py-6 text-center text-xs font-medium text-slate-500 sm:px-6 admin-dark:border-[#1e3a65] admin-dark:bg-[#0f2547] admin-dark:text-[#8da0c0]">
        MediSpark Admin Panel — Premium Navy Smart Dashboard
      </footer>
    </div>
  );
}
