"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
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
  CoursesIcon,
  BookOpenIcon,
  ExamsIcon,
  FaqIcon,
  StudentsIcon,
  EnrollmentsIcon,
  MegaphoneIcon,
  UserShieldIcon,
  ResultsChartIcon,
  HomeIcon,
} from "@/components/admin/icons";
import { AdminThemeProvider, useAdminTheme } from "@/components/admin/AdminThemeProvider";
import AdminThemeToggle from "@/components/admin/AdminThemeToggle";
import AdminToastProvider from "@/components/admin/AdminToastProvider";
import AdminSearch from "@/components/admin/AdminSearch";
import { useAdminGate } from "@/components/admin/admin-ui";
import { useAuth } from "@/lib/auth-context";

const SIDEBAR_STORAGE_KEY = "medispark-admin-sidebar-collapsed";

// === Required sidebar structure: HOME separate + MANAGEMENT heading + Home Page Control after Enrollment ===
const ADMIN_NAV = [
  { label: "HOME", href: "/admin", icon: DashboardIcon },
  { label: "Website Control", href: "/admin/website-information", icon: WebsiteIcon },
  { label: "Enrollment Control", href: "/admin/enrollment-control", icon: EnrollmentsIcon },
  { label: "Home Page Control", href: "/admin/home-control", icon: HomeIcon },
  { label: "Course Control", href: "/admin/course-control", icon: CoursesIcon },
  { label: "Course Content Control", href: "/admin/course-content-control", icon: BookOpenIcon },
  { label: "Material PDF Generator", href: "/admin/material-pdf", icon: ExamsIcon },
  { label: "Public Exam Control", href: "/admin/public-exam-control", icon: ExamsIcon },
  { label: "Q&A Control", href: "/admin/qa-control", icon: FaqIcon },
  { label: "Dashboard Control", href: "/admin/dashboard-control", icon: DashboardIcon },
  { label: "Student Control", href: "/admin/student-control", icon: StudentsIcon },
  { label: "Result Control", href: "/admin/result-control", icon: ResultsChartIcon },
  { label: "Notification Control", href: "/admin/notification-control", icon: MegaphoneIcon },
  { label: "Admin Center", href: "/admin/admin-center", icon: UserShieldIcon },
] as const;

const ADMIN_CONTROL_PERMISSIONS: Record<string, readonly string[]> = {
  "/admin/website-information": ["manageContent"],
  "/admin/enrollment-control": ["manageStudents", "manageCourses"],
  "/admin/home-control": ["manageContent"],
  "/admin/course-control": ["manageCourses"],
  "/admin/course-content-control": ["manageCourseContent", "manageCourses"],
  "/admin/material-pdf": ["manageCourses", "manageCourseContent", "manageExams"],
  "/admin/public-exam-control": ["managePublicExam", "manageExams"],
  "/admin/qa-control": ["manageQa", "manageContent"],
  "/admin/dashboard-control": ["manageSystem", "manageContent"],
  "/admin/student-control": ["manageStudents"],
  "/admin/result-control": ["manageResults", "manageExams"],
  "/admin/notification-control": ["manageContent", "manageSystem"],
  "/admin/admin-center": ["manageAdmins"],
};

function hasControlAccess(
  role: string | null,
  permissions: string[],
  href: string,
): boolean {
  if (role === "admin" || role === "moderator" || role === "teacher") return true;
  if (href === "/admin") return true;
  const required = ADMIN_CONTROL_PERMISSIONS[href];
  if (!required) return true;
  return required.some((perm) => permissions.includes(perm));
}

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
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
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

  // Filtered nav for RBAC — respects role permissions, keeps routes unchanged
  const visibleNav = ADMIN_NAV.filter((item) =>
    hasControlAccess(gate.role, gate.permissions, item.href),
  );
  const homeItem = visibleNav.find((i) => i.href === "/admin") ?? ADMIN_NAV[0];
  const managementItems = visibleNav.filter((i) => i.href !== "/admin");

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(href + "/");

  // Header title/breadcrumb prefers ADMIN_NAV match for new routes
  const activeNavItem = [...ADMIN_NAV]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => pathname === item.href || pathname.startsWith(item.href + "/"));
  const displayTitle = activeNavItem ? activeNavItem.label : active.title;
  const displayBreadcrumbs =
    activeNavItem && activeNavItem.href !== "/admin"
      ? [
          { label: "HOME", href: "/admin" },
          { label: activeNavItem.label, href: activeNavItem.href },
        ]
      : active.breadcrumbs;

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
        {/* HOME — completely separate and appears first */}
        <Link
          href={homeItem.href}
          title={collapsed ? homeItem.label : undefined}
          onClick={closeOverlays}
          aria-current={isActive(homeItem.href) ? "page" : undefined}
          className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition duration-200 ${
            collapsed ? "justify-center" : ""
          } ${
            isActive(homeItem.href)
              ? "bg-primary-600 text-white shadow-md shadow-primary-900/40"
              : "text-zinc-400 hover:bg-white/5 hover:text-white"
          }`}
        >
          <homeItem.icon className="h-5 w-5 shrink-0" />
          {!collapsed && <span>{homeItem.label}</span>}
        </Link>

        {/* MANAGEMENT — visual heading only, not clickable */}
        <p
          className={`px-3 pb-1 pt-5 text-[11px] font-bold uppercase tracking-widest text-zinc-600 ${
            collapsed ? "text-center" : ""
          }`}
        >
          {collapsed ? "•••" : "MANAGEMENT"}
        </p>

        <ul className="space-y-1">
          {managementItems.map((item) => {
            const activeItem = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  onClick={closeOverlays}
                  aria-current={activeItem ? "page" : undefined}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition duration-200 ${
                    collapsed ? "justify-center" : ""
                  } ${
                    activeItem
                      ? "bg-primary-600 text-white shadow-md shadow-primary-900/40"
                      : "text-zinc-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
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
    <AdminToastProvider>
      <div
        data-admin-theme={theme}
        className="flex min-h-screen bg-neutral-100 transition-colors duration-300 admin-dark:bg-zinc-950"
      >
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
        <header className={`sticky top-0 z-40 flex h-16 shrink-0 items-center gap-3 border-b border-neutral-200 bg-white/90 px-4 backdrop-blur transition-all duration-300 sm:px-6 admin-dark:border-zinc-800 admin-dark:bg-zinc-900/90 ${scrolled ? "lg:shadow-lg lg:shadow-black/25" : ""}`}>
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 text-zinc-700 transition hover:border-primary-500/60 hover:bg-neutral-50 lg:hidden admin-dark:border-zinc-700 admin-dark:text-zinc-200 admin-dark:hover:bg-zinc-800"
          >
            <MenuIcon className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1">
            {displayBreadcrumbs.length > 1 && (
              <nav aria-label="Breadcrumb" className="hidden sm:block">
                <ol className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500">
                  {displayBreadcrumbs.slice(0, -1).map((crumb, index) => (
                    <li key={crumb.href + index} className="flex items-center gap-1.5">
                      <Link
                        href={crumb.href}
                        className="transition hover:text-primary-400"
                      >
                        {crumb.label}
                      </Link>
                      <span className="text-zinc-700">/</span>
                    </li>
                  ))}
                </ol>
              </nav>
            )}
            <h1 className="truncate text-base font-bold text-zinc-900 transition-colors duration-300 sm:text-lg admin-dark:text-zinc-50">
              {displayTitle}
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
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 text-zinc-700 transition hover:border-primary-500/60 hover:bg-neutral-50 md:hidden admin-dark:border-zinc-700 admin-dark:text-zinc-200 admin-dark:hover:bg-zinc-800"
            >
              <SearchIcon className="h-5 w-5" />
            </button>

            {/* Theme toggle — Admin Panel only */}
            <AdminThemeToggle />

            {/* Notifications */}
            <button
              type="button"
              aria-label="Notifications"
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 text-zinc-700 transition hover:border-primary-500/60 hover:bg-neutral-50 admin-dark:border-zinc-700 admin-dark:text-zinc-200 admin-dark:hover:bg-zinc-800"
            >
              <NotificationsIcon className="h-5 w-5" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary-600" />
            </button>

            {/* Profile */}
            <div ref={profileRef} className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen((open) => !open)}
                className="flex items-center gap-2.5 rounded-xl border border-neutral-200 py-1.5 pl-1.5 pr-2.5 transition hover:border-primary-500/60 hover:bg-neutral-50 sm:pr-3 admin-dark:border-zinc-700 admin-dark:hover:bg-zinc-800"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-600 text-xs font-bold text-white">
                  A
                </span>
                <span className="hidden text-left sm:block">
                  <span className="block text-xs font-bold leading-tight text-zinc-900 admin-dark:text-zinc-50">
                    Admin
                  </span>
                  <span className="block text-[10px] leading-tight text-zinc-500">
                    Administrator
                  </span>
                </span>
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xl shadow-black/10 admin-dark:border-zinc-700 admin-dark:bg-zinc-900">
                  <div className="border-b border-neutral-100 px-4 py-3 admin-dark:border-zinc-800">
                    <p className="text-sm font-bold text-zinc-900 admin-dark:text-zinc-50">
                      Admin
                    </p>
                    <p className="text-xs text-zinc-500">admin@medispark.com</p>
                  </div>
                  <Link
                    href="/admin/administration/admins"
                    onClick={closeOverlays}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-neutral-50 admin-dark:text-zinc-200 admin-dark:hover:bg-zinc-800"
                  >
                    <SettingsIcon className="h-4 w-4 text-zinc-400" />
                    Profile Settings
                  </Link>
                  <button
                    type="button"
                    onClick={() => void handleLogout()}
                    className="flex w-full items-center gap-2.5 border-t border-neutral-100 px-4 py-2.5 text-sm font-medium text-primary-700 transition hover:bg-primary-600/5 admin-dark:border-zinc-800 admin-dark:text-primary-400"
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
          <div className="sticky top-16 z-30 border-b border-neutral-200 bg-white px-4 py-3 transition-colors duration-300 md:hidden admin-dark:border-zinc-800 admin-dark:bg-zinc-900">
            <AdminSearch
              autoFocus
              onNavigate={() => setMobileSearchOpen(false)}
            />
          </div>
        )}

        <main className="flex-1">{children}</main>
      </div>
      </div>
    </AdminToastProvider>
  );
}
