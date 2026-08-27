"use client";

import Link from "next/link";
import { useAdminGate } from "@/components/admin/admin-ui";
import { AccessLoading } from "@/components/auth/AccessGuard";

/**
 * Admin Panel Home — exactly 12 control cards (2 columns × 6 rows on every
 * device), each with an icon on the left and the control name on the right.
 * RBAC: Teacher sees only 4 teaching controls; other roles see their permitted set.
 */

const CARDS: Array<{ href: string; icon: string; title: string }> = [
  { href: "/admin/website-information", icon: "🌐", title: "Website Information" },
  { href: "/admin/enrollment-control", icon: "📋", title: "Enrollment Control" },
  { href: "/admin/home-control", icon: "🏡", title: "Home Control" },
  { href: "/admin/course-control", icon: "📚", title: "Course Control" },
  { href: "/admin/course-content-control", icon: "📖", title: "Course Content Control" },
  { href: "/admin/public-exam-control", icon: "📝", title: "Public Exam Control" },
  { href: "/admin/qa-control", icon: "❓", title: "Q&A Control" },
  { href: "/admin/dashboard-control", icon: "📊", title: "Dashboard Control" },
  { href: "/admin/student-control", icon: "👨‍🎓", title: "Student Control" },
  { href: "/admin/result-control", icon: "🏆", title: "Result Control" },
  { href: "/admin/notification-control", icon: "🔔", title: "Notification Control" },
  { href: "/admin/admin-center", icon: "🛡️", title: "Admin Center" },
];

// Client-safe RBAC mapping (mirrors src/lib/administration.ts)
const CARD_PERMISSIONS: Record<string, readonly string[]> = {
  "/admin/website-information": ["manageContent"],
  "/admin/enrollment-control": ["manageStudents", "manageCourses"],
  "/admin/home-control": ["manageContent"],
  "/admin/course-control": ["manageCourses"],
  "/admin/course-content-control": ["manageCourseContent", "manageCourses"],
  "/admin/public-exam-control": ["managePublicExam", "manageExams"],
  "/admin/qa-control": ["manageQa", "manageContent"],
  "/admin/dashboard-control": ["manageSystem", "manageContent"],
  "/admin/student-control": ["manageStudents"],
  "/admin/result-control": ["manageResults", "manageExams"],
  "/admin/notification-control": ["manageContent", "manageSystem"],
  "/admin/admin-center": ["manageAdmins"],
};

function hasAccess(role: string | null, permissions: string[], href: string): boolean {
  if (role === "super-admin") return true;
  const required = CARD_PERMISSIONS[href];
  if (!required) return true;
  return required.some((perm) => permissions.includes(perm));
}

export default function AdminHomePage() {
  const gate = useAdminGate();
  const ready = gate.ready;
  const visibleCards = ready
    ? CARDS.filter((card) => hasAccess(gate.role, gate.permissions, card.href))
    : CARDS;
  return (
    <section className="mx-auto max-w-6xl px-3 py-10 sm:px-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-widest text-[#234e9f] admin-dark:text-[#93c5fd]">
          Admin Panel
        </p>
        <h1 className="mt-2 text-2xl font-extrabold text-[#0b1e3a] sm:text-3xl admin-dark:text-white">
          MediSpark Management
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500 admin-dark:text-[#8da0c0]">
          The Main Website with full control. Pick a section — every change is
          saved to MySQL and appears on the Main Website immediately.
        </p>
      </header>

      {!ready && <AccessLoading label="Loading Admin Panel…" />}
      {ready && visibleCards.length === 0 && (
        <div className="mt-8 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-6 text-center">
          <p className="text-sm font-bold text-yellow-600 admin-dark:text-yellow-300">No accessible controls for your role.</p>
          <p className="mt-1 text-xs text-neutral-500">Contact a Super Admin to grant permissions.</p>
        </div>
      )}
      {ready && gate.role === "teacher" && (
        <p className="mt-4 rounded-xl border border-[#dbeafe] bg-[#eff6ff] px-4 py-3 text-xs font-semibold text-[#1a3a78] admin-dark:border-[#1e3a65] admin-dark:bg-[#132a4f] admin-dark:text-[#93c5fd]">
          Teacher access: Course Content Control · Public Exam Control · Q&A Answer · Result Control
        </p>
      )}
      {/* Exactly 2 columns × 6 rows on every device — Unified Smart Card */}
      <nav className="mt-8 grid grid-cols-2 gap-3 sm:gap-4">
        {(ready ? visibleCards : CARDS).map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group flex min-h-[72px] items-center gap-3 overflow-hidden rounded-2xl border border-[#dbeafe] bg-white p-3 shadow-sm shadow-[#0b1e3a]/5 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#93c5fd] hover:shadow-md hover:shadow-[#0b1e3a]/10 sm:min-h-[84px] sm:p-5 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] admin-dark:shadow-black/20 admin-dark:hover:border-[#2f5aa0]"
          >
            <span
              aria-hidden
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eff6ff] text-lg ring-1 ring-[#dbeafe] transition group-hover:bg-[#1a3a78] group-hover:text-white group-hover:ring-[#1a3a78] sm:h-12 sm:w-12 sm:text-2xl admin-dark:bg-[#0f2547] admin-dark:ring-[#1e3a65] admin-dark:group-hover:bg-[#234e9f]"
            >
              {card.icon}
            </span>
            <span className="min-w-0 flex-1 break-words text-sm font-extrabold leading-snug text-[#0b1e3a] transition group-hover:text-[#1a3a78] sm:text-base admin-dark:text-white admin-dark:group-hover:text-[#93c5fd]">
              {card.title}
            </span>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
              className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-[#234e9f] admin-dark:text-[#8da0c0] admin-dark:group-hover:text-[#93c5fd]"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ))}
      </nav>
    </section>
  );
}
