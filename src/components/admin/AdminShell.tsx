"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminNavGroups, findActiveAdminNav } from "@/lib/admin-nav";
import {
  CloseIcon,
  MenuIcon,
  PanelLeftIcon,
  WebsiteIcon,
} from "@/components/admin/icons";

const SIDEBAR_STORAGE_KEY = "medispark-admin-sidebar-collapsed";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only available after mount (SSR-safe)
      setCollapsed(
        window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "collapsed"
      );
    } catch {}
  }, []);

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

  const active = findActiveAdminNav(pathname);

  const nav = (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
      {adminNavGroups.map((group) => (
        <div key={group.label}>
          {!collapsed && (
            <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-widest text-neutral-500">
              {group.label}
            </p>
          )}
          <ul className="space-y-1">
            {group.items.map((item) => {
              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname === item.href ||
                    pathname.startsWith(item.href + "/");
              return (
                <li key={item.label + item.href}>
                  <Link
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    onClick={() => setMobileOpen(false)}
                    className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition duration-200 ${
                      collapsed ? "justify-center" : ""
                    } ${
                      isActive
                        ? "bg-primary-600/15 text-primary-400 shadow-sm shadow-primary-900/30"
                        : "text-neutral-400 hover:bg-ink/5 hover:text-heading"
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center ${
                        isActive
                          ? "text-primary-500"
                          : "text-neutral-500 transition group-hover:text-primary-400"
                      }`}
                    >
                      <item.icon className="h-5 w-5" />
                    </span>
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const brand = (
    <Link
      href="/admin"
      className={`flex h-16 shrink-0 items-center gap-3 border-b border-ink/10 px-5 ${
        collapsed ? "justify-center px-0" : ""
      }`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white shadow-lg shadow-primary-900/40">
        <WebsiteIcon className="h-5 w-5" />
      </span>
      {!collapsed && (
        <span className="min-w-0">
          <span className="block truncate text-sm font-extrabold tracking-tight text-heading">
            MediSpark Admin
          </span>
          <span className="block text-[11px] font-semibold uppercase tracking-widest text-primary-500">
            Control Center
          </span>
        </span>
      )}
    </Link>
  );

  return (
    <div className="flex min-h-screen bg-dark-950">
      {/* Desktop sidebar */}
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-ink/10 bg-dark-950 lg:flex ${
          collapsed ? "w-[76px]" : "w-72"
        } transition-[width] duration-300`}
      >
        {brand}
        {nav}
        <div className="shrink-0 border-t border-ink/10 p-3">
          <button
            type="button"
            onClick={toggleCollapsed}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-neutral-400 transition hover:bg-ink/5 hover:text-heading ${
              collapsed ? "justify-center px-0" : ""
            }`}
          >
            <PanelLeftIcon className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Collapse Sidebar</span>}
          </button>
        </div>
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
          <aside className="absolute left-0 top-0 flex h-full w-72 max-w-[85vw] flex-col border-r border-ink/10 bg-dark-950 shadow-2xl shadow-black/60">
            <div className="relative">
              {brand}
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMobileOpen(false)}
                className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-ink/10 hover:text-heading"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
            {nav}
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top header */}
        <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-3 border-b border-ink/10 bg-dark-950/90 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-ink/15 bg-ink/5 text-heading transition hover:border-primary-500/60 hover:bg-ink/10 lg:hidden"
          >
            <MenuIcon className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">
              Admin Panel
            </p>
            <h1 className="truncate text-base font-bold text-heading sm:text-lg">
              {active?.label ?? "Dashboard"}
            </h1>
          </div>

          <span className="hidden items-center gap-2 rounded-full border border-primary-600/30 bg-primary-600/10 px-3 py-1.5 text-xs font-bold text-primary-400 sm:flex">
            <span className="h-2 w-2 rounded-full bg-primary-500" />
            UI Preview
          </span>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
