"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  adminCategories,
  adminProfileCategory,
  findAdminCategory,
  findActiveAdminNav,
} from "@/lib/admin-nav";
import {
  CloseIcon,
  ChevronDownIcon,
  DashboardIcon,
  MenuIcon,
  SearchIcon,
  NotificationsIcon,
  SettingsIcon,
  LogoutIcon,
  WebsiteIcon,
  PanelLeftIcon,
} from "@/components/admin/icons";
import { AdminThemeProvider, useAdminTheme } from "@/components/admin/AdminThemeProvider";
import AdminThemeToggle from "@/components/admin/AdminThemeToggle";
import AdminToastProvider from "@/components/admin/AdminToastProvider";
import AdminSearch from "@/components/admin/AdminSearch";
import { useAdminGate, hasAdminPermission } from "@/components/admin/admin-ui";
import { useAuth } from "@/lib/auth-context";

const SIDEBAR_STORAGE_KEY = "medispark-admin-sidebar-collapsed";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <AdminThemeProvider>
      <AdminShellInner>{children}</AdminShellInner>
    </AdminThemeProvider>
  );
}

function AdminShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme } = useAdminTheme();
  const gate = useAdminGate();
  const { user, logout: signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [manualOpenSection, setManualOpenSection] = useState<string | null>(null);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // localStorage is only available after mount (SSR-safe restore)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCollapsed(
      window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "collapsed"
    );
  }, []);

  useEffect(() => {
    if (!profileOpen) return;
    const onClick = (event: MouseEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [profileOpen]);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(
          SIDEBAR_STORAGE_KEY,
          next ? "collapsed" : "expanded"
        );
      } catch {}
      return next;
    });
  };

  const handleLogout = async () => {
    closeOverlays();
    try {
      if (user) {
        const token = await user.getIdToken();
        await fetch("/api/admin/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
      // Logging the logout is best-effort — always sign out.
    }
    await signOut();
    router.replace("/");
  };

  const closeOverlays = () => {
    setMobileOpen(false);
    setProfileOpen(false);
  };

  const active = findActiveAdminNav(pathname);
  const activeSectionHref = findAdminCategory(pathname)?.href ?? null;
  const openSection = manualOpenSection !== null ? manualOpenSection : activeSectionHref;

  // Role-based navigation: hide sections the admin's role does not cover.
  // (Writes are enforced server-side regardless of what the UI shows.)
  const visibleCategories = adminCategories.filter(
    (category) =>
      category.permission === null ||
      hasAdminPermission(gate, category.permission),
  );

  const toggleSection = (href: string) => {
    setManualOpenSection(openSection === href ? "" : href);
  };

  const renderSection = (category: (typeof adminCategories)[number]) => {
    const isActive = activeSectionHref === category.href;
    const isOpen = !collapsed && openSection === category.href;
    return (
      <li key={category.href}>
        <div
          className={`flex items-center rounded-xl transition duration-200 ${
            isActive && !isOpen
              ? "bg-[#234e9f] text-white shadow-md shadow-black/20"
              : "hover:bg-white/[0.07]"
          }`}
        >
          <Link
            href={category.href}
            title={collapsed ? category.name : undefined}
            onClick={() => {
              closeOverlays();
              setManualOpenSection(category.href);
            }}
            className={`group flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-sm font-medium transition duration-200 ${
              collapsed ? "justify-center" : ""
            } ${
              isActive && !isOpen
                ? "text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <category.icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span className="truncate">{category.name}</span>}
          </Link>
          {!collapsed && (
            <button
              type="button"
              aria-label={isOpen ? `Collapse ${category.name}` : `Expand ${category.name}`}
              aria-expanded={isOpen}
              onClick={() => toggleSection(category.href)}
              className="mr-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              <ChevronDownIcon
                className={`h-4 w-4 transition-transform duration-200 ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </button>
          )}
        </div>

        {isOpen && (
          <ul className="mt-1 space-y-0.5 border-l border-white/10 pb-1 pl-4 ml-5">
            {category.subsections.map((sub) => {
              const subActive =
                pathname === sub.href ||
                (sub.href !== category.href &&
                  pathname.startsWith(sub.href + "/"));
              return (
                <li key={sub.label + sub.href}>
                  <Link
                    href={sub.href}
                    onClick={closeOverlays}
                    aria-current={subActive ? "page" : undefined}
                    className={`block truncate rounded-lg px-3 py-1.5 text-[13px] font-medium transition duration-150 ${
                      subActive
                        ? "bg-[#234e9f]/20 text-[#93c5fd]"
                        : "text-slate-400 hover:bg-white/[0.06] hover:text-slate-200"
                    }`}
                  >
                    {sub.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </li>
    );
  };

  const sidebarContent = (
    <>
      <Link
        href="/admin"
        className={`flex h-16 shrink-0 items-center gap-3 border-b border-white/10 px-5 ${
          collapsed ? "justify-center px-0" : ""
        }`}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#234e9f] text-white shadow-lg shadow-black/20">
          <WebsiteIcon className="h-5 w-5" />
        </span>
        {!collapsed && (
          <span className="min-w-0">
            <span className="block truncate text-sm font-extrabold tracking-tight text-white">
              MediSpark Admin
            </span>
            <span className="block text-[11px] font-semibold uppercase tracking-widest text-[#93c5fd]">
              Control Center
            </span>
          </span>
        )}
      </Link>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <Link
          href="/admin"
          title={collapsed ? "Home" : undefined}
          onClick={closeOverlays}
          className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition duration-200 ${
            collapsed ? "justify-center" : ""
          } ${
            pathname === "/admin"
              ? "bg-[#234e9f] text-white shadow-md shadow-black/20"
              : "text-slate-400 hover:bg-white/[0.07] hover:text-white"
          }`}
        >
          <DashboardIcon className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Home</span>}
        </Link>

        <p
          className={`px-3 pb-1 pt-5 text-[11px] font-bold uppercase tracking-widest text-slate-500 ${
            collapsed ? "text-center" : ""
          }`}
        >
          {collapsed ? "•••" : "Management"}
        </p>

        <ul className="space-y-1">
          {visibleCategories.map(renderSection)}
        </ul>

        <p
          className={`px-3 pb-1 pt-5 text-[11px] font-bold uppercase tracking-widest text-slate-500 ${
            collapsed ? "text-center" : ""
          }`}
        >
          {collapsed ? "•••" : "Account"}
        </p>

        <ul className="space-y-1">
          {renderSection(adminProfileCategory)}
        </ul>
      </nav>

      <div className="shrink-0 border-t border-white/10 p-3">
        <button
          type="button"
          onClick={toggleCollapsed}
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-white/[0.07] hover:text-white ${
            collapsed ? "justify-center px-0" : ""
          }`}
        >
          <PanelLeftIcon className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </>
  );

  return (
    <AdminToastProvider>
      <div
        data-admin-theme={theme}
        className="flex min-h-screen overflow-x-hidden bg-[#f1f5f9] transition-colors duration-300 admin-dark:bg-[#0a162e]"
      >
      {/* Desktop sidebar — Deep Navy (visible only on xl+; hamburger handles laptop/tablet) */}
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 flex-col bg-[#0b1e3a] xl:flex ${
          collapsed ? "w-[76px]" : "w-64"
        } transition-[width] duration-300`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile/tablet/laptop drawer — Deep Navy with subtle overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[70] xl:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
          />
          <aside className="absolute left-0 top-0 flex h-full w-72 max-w-[85vw] flex-col bg-[#0b1e3a] shadow-2xl shadow-black/60">
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
        {/* Top header — clean white/light-blue */}
        <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-3 border-b border-[#dbeafe] bg-white px-4 shadow-sm transition-colors duration-300 sm:px-6 admin-dark:border-[#1e3a65] admin-dark:bg-[#0f2547]">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#dbeafe] bg-[#f8fbff] text-[#1a3a78] transition hover:border-[#93c5fd] hover:bg-[#eff6ff] xl:hidden admin-dark:border-[#1e3a65] admin-dark:bg-[#132a4f] admin-dark:text-[#93c5fd] admin-dark:hover:bg-[#1a3a78]"
          >
            <MenuIcon className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1">
            {active.breadcrumbs.length > 1 && (
              <nav aria-label="Breadcrumb" className="hidden sm:block">
                <ol className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 admin-dark:text-[#8da0c0]">
                  {active.breadcrumbs.slice(0, -1).map((crumb, index) => (
                    <li key={crumb.href + index} className="flex items-center gap-1.5">
                      <Link
                        href={crumb.href}
                        className="transition hover:text-[#234e9f] admin-dark:hover:text-[#93c5fd]"
                      >
                        {crumb.label}
                      </Link>
                      <span className="text-slate-400 admin-dark:text-slate-600">/</span>
                    </li>
                  ))}
                </ol>
              </nav>
            )}
            <h1 className="truncate text-base font-bold text-[#0b1e3a] transition-colors duration-300 sm:text-lg admin-dark:text-white">
              {active.title}
            </h1>
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            {/* Search — desktop dropdown */}
            <div className="hidden w-40 md:block lg:w-52 xl:w-64">
              <AdminSearch />
            </div>
            {/* Search toggle — mobile */}
            <button
              type="button"
              aria-label="Search sections"
              onClick={() => setMobileSearchOpen((open) => !open)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#dbeafe] bg-[#f8fbff] text-[#1a3a78] transition hover:border-[#93c5fd] hover:bg-[#eff6ff] md:hidden admin-dark:border-[#1e3a65] admin-dark:bg-[#132a4f] admin-dark:text-[#93c5fd] admin-dark:hover:bg-[#1a3a78]"
            >
              <SearchIcon className="h-5 w-5" />
            </button>

            {/* Theme toggle — Admin Panel only */}
            <AdminThemeToggle />

            {/* Notifications */}
            <button
              type="button"
              aria-label="Notifications"
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[#dbeafe] bg-[#f8fbff] text-[#1a3a78] transition hover:border-[#93c5fd] hover:bg-[#eff6ff] admin-dark:border-[#1e3a65] admin-dark:bg-[#132a4f] admin-dark:text-[#93c5fd] admin-dark:hover:bg-[#1a3a78]"
            >
              <NotificationsIcon className="h-5 w-5" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#234e9f] admin-dark:bg-[#60a5fa]" />
            </button>

            {/* Profile */}
            <div ref={profileRef} className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen((open) => !open)}
                className="flex items-center gap-2.5 rounded-xl border border-[#dbeafe] bg-[#f8fbff] py-1.5 pl-1.5 pr-2.5 transition hover:border-[#93c5fd] hover:bg-[#eff6ff] sm:pr-3 admin-dark:border-[#1e3a65] admin-dark:bg-[#132a4f] admin-dark:hover:bg-[#1a3a78]"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1a3a78] text-xs font-bold text-white admin-dark:bg-[#234e9f]">
                  A
                </span>
                <span className="hidden text-left sm:block">
                  <span className="block text-xs font-bold leading-tight text-[#0b1e3a] admin-dark:text-white">
                    Admin
                  </span>
                  <span className="block text-[10px] leading-tight text-slate-500 admin-dark:text-[#8da0c0]">
                    Administrator
                  </span>
                </span>
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 overflow-hidden rounded-xl border border-[#dbeafe] bg-white shadow-xl shadow-[#0b1e3a]/10 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544]">
                  <div className="border-b border-[#eef4ff] px-4 py-3 admin-dark:border-[#1e3a65]">
                    <p className="text-sm font-bold text-[#0b1e3a] admin-dark:text-white">
                      Admin
                    </p>
                    <p className="text-xs text-slate-500 admin-dark:text-[#8da0c0]">admin@medispark.com</p>
                  </div>
                  <Link
                    href="/admin/administration/admins"
                    onClick={closeOverlays}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-[#f8fbff] admin-dark:text-slate-200 admin-dark:hover:bg-[#132a4f]"
                  >
                    <SettingsIcon className="h-4 w-4 text-slate-400" />
                    Profile Settings
                  </Link>
                  <button
                    type="button"
                    onClick={() => void handleLogout()}
                    className="flex w-full items-center gap-2.5 border-t border-[#eef4ff] px-4 py-2.5 text-sm font-medium text-[#1a3a78] transition hover:bg-[#eff6ff] admin-dark:border-[#1e3a65] admin-dark:text-[#93c5fd] admin-dark:hover:bg-[#132a4f]"
                  >
                    <LogoutIcon className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Mobile search panel */}
        {mobileSearchOpen && (
          <div className="sticky top-16 z-30 border-b border-[#dbeafe] bg-white px-4 py-3 shadow-sm transition-colors duration-300 md:hidden admin-dark:border-[#1e3a65] admin-dark:bg-[#0f2547]">
            <AdminSearch
              autoFocus
              onNavigate={() => setMobileSearchOpen(false)}
            />
          </div>
        )}

        <main className="flex-1 bg-transparent">{children}</main>
      </div>
      </div>
    </AdminToastProvider>
  );
}
