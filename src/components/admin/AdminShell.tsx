"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  adminCategories,
  findActiveAdminNav,
} from "@/lib/admin-nav";
import {
  CloseIcon,
  DashboardIcon,
  MenuIcon,
  SearchIcon,
  NotificationsIcon,
  SettingsIcon,
  LogoutIcon,
  WebsiteIcon,
  PanelLeftIcon,
} from "@/components/admin/icons";

const SIDEBAR_STORAGE_KEY = "medispark-admin-sidebar-collapsed";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
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

  const closeOverlays = () => {
    setMobileOpen(false);
    setProfileOpen(false);
  };

  const active = findActiveAdminNav(pathname);

  const sidebarContent = (
    <>
      <Link
        href="/admin"
        className={`flex h-16 shrink-0 items-center gap-3 border-b border-white/10 px-5 ${
          collapsed ? "justify-center px-0" : ""
        }`}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white shadow-lg shadow-primary-900/40">
          <WebsiteIcon className="h-5 w-5" />
        </span>
        {!collapsed && (
          <span className="min-w-0">
            <span className="block truncate text-sm font-extrabold tracking-tight text-white">
              MediSpark Admin
            </span>
            <span className="block text-[11px] font-semibold uppercase tracking-widest text-primary-500">
              Control Center
            </span>
          </span>
        )}
      </Link>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <Link
          href="/admin"
          title={collapsed ? "Dashboard" : undefined}
          onClick={closeOverlays}
          className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition duration-200 ${
            collapsed ? "justify-center" : ""
          } ${
            pathname === "/admin"
              ? "bg-primary-600 text-white shadow-md shadow-primary-900/40"
              : "text-zinc-400 hover:bg-white/5 hover:text-white"
          }`}
        >
          <DashboardIcon className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Dashboard</span>}
        </Link>

        <p
          className={`px-3 pb-1 pt-5 text-[11px] font-bold uppercase tracking-widest text-zinc-600 ${
            collapsed ? "text-center" : ""
          }`}
        >
          {collapsed ? "•••" : "Management"}
        </p>

        {adminCategories.map((category) => {
          const isActive =
            pathname === category.href ||
            pathname.startsWith(category.href + "/");
          return (
            <Link
              key={category.href}
              href={category.href}
              title={collapsed ? category.name : undefined}
              onClick={closeOverlays}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition duration-200 ${
                collapsed ? "justify-center" : ""
              } ${
                isActive
                  ? "bg-primary-600 text-white shadow-md shadow-primary-900/40"
                  : "text-zinc-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <category.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span className="truncate">{category.name}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-white/10 p-3">
        <button
          type="button"
          onClick={toggleCollapsed}
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-400 transition hover:bg-white/5 hover:text-white ${
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
    <div className="flex min-h-screen bg-neutral-100">
      {/* Desktop sidebar */}
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 flex-col bg-zinc-950 lg:flex ${
          collapsed ? "w-[76px]" : "w-64"
        } transition-[width] duration-300`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <aside className="absolute left-0 top-0 flex h-full w-72 max-w-[85vw] flex-col bg-zinc-950 shadow-2xl shadow-black/60">
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-white/10 hover:text-white"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top header */}
        <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-3 border-b border-neutral-200 bg-white px-4 sm:px-6">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 text-zinc-700 transition hover:border-primary-500/60 hover:bg-neutral-50 lg:hidden"
          >
            <MenuIcon className="h-5 w-5" />
          </button>

          <h1 className="min-w-0 truncate text-base font-bold text-zinc-900 sm:text-lg">
            {active?.title ?? "Dashboard"}
          </h1>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            {/* Search */}
            <label className="hidden items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 transition focus-within:border-primary-500/60 focus-within:bg-white md:flex">
              <SearchIcon className="h-4 w-4 shrink-0 text-zinc-400" />
              <input
                type="search"
                placeholder="Search..."
                className="w-36 bg-transparent text-sm text-zinc-800 outline-none placeholder:text-zinc-400 lg:w-48"
              />
            </label>

            {/* Notifications */}
            <button
              type="button"
              aria-label="Notifications"
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 text-zinc-700 transition hover:border-primary-500/60 hover:bg-neutral-50"
            >
              <NotificationsIcon className="h-5 w-5" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary-600" />
            </button>

            {/* Profile */}
            <div ref={profileRef} className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen((open) => !open)}
                className="flex items-center gap-2.5 rounded-xl border border-neutral-200 py-1.5 pl-1.5 pr-2.5 transition hover:border-primary-500/60 hover:bg-neutral-50 sm:pr-3"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-600 text-xs font-bold text-white">
                  A
                </span>
                <span className="hidden text-left sm:block">
                  <span className="block text-xs font-bold leading-tight text-zinc-900">
                    Admin
                  </span>
                  <span className="block text-[10px] leading-tight text-zinc-500">
                    Administrator
                  </span>
                </span>
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xl shadow-black/10">
                  <div className="border-b border-neutral-100 px-4 py-3">
                    <p className="text-sm font-bold text-zinc-900">Admin</p>
                    <p className="text-xs text-zinc-500">admin@medispark.com</p>
                  </div>
                  <Link
                    href="/admin/administration/admins"
                    onClick={closeOverlays}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-neutral-50"
                  >
                    <SettingsIcon className="h-4 w-4 text-zinc-400" />
                    Profile Settings
                  </Link>
                  <button
                    type="button"
                    onClick={closeOverlays}
                    className="flex w-full items-center gap-2.5 border-t border-neutral-100 px-4 py-2.5 text-sm font-medium text-primary-700 transition hover:bg-primary-600/5"
                  >
                    <LogoutIcon className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
