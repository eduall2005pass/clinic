import type { Metadata } from "next";
import Link from "next/link";
import {
  ActivityLogIcon,
  ArrowUpRightIcon,
  BookOpenIcon,
  CalendarIcon,
  EnrollmentsIcon,
  ExamsIcon,
  MentorsIcon,
  StudentsIcon,
} from "@/components/admin/icons";

export const metadata: Metadata = {
  title: "Dashboard — MediSpark Admin",
  description:
    "MediSpark admin control center overview — students, courses, enrollments, exams and mentors at a glance.",
};

const stats = [
  { label: "Total Students", value: "—", icon: StudentsIcon },
  { label: "Total Courses", value: "—", icon: BookOpenIcon },
  { label: "Total Enrollments", value: "—", icon: EnrollmentsIcon },
  { label: "Total Exams", value: "—", icon: ExamsIcon },
  { label: "Active Mentors", value: "—", icon: MentorsIcon },
  { label: "Upcoming Exams", value: "—", icon: CalendarIcon },
];

const recentSections = [
  {
    title: "Recent Enrollments",
    description:
      "Latest course enrollments will appear here once enrollment data is connected.",
    icon: EnrollmentsIcon,
  },
  {
    title: "Recent Students",
    description:
      "Newly registered students will appear here once student data is connected.",
    icon: StudentsIcon,
  },
  {
    title: "Recent Activity",
    description:
      "Admin and website activity logs will appear here once logging is connected.",
    icon: ActivityLogIcon,
  },
];

export default function AdminDashboardPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      {/* Page intro */}
      <div className="rounded-2xl border border-primary-600/30 bg-primary-600/10 p-6 shadow-lg shadow-black/20 sm:p-8">
        <h2 className="text-xl font-extrabold text-heading sm:text-2xl">
          Website Control Center
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-400">
          Control the entire MediSpark website from one place — content,
          courses, students, exams and mentors. Data will flow from here
          through MySQL to the live website, so changes go live without
          touching code.
        </p>
      </div>

      {/* Stat cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-ink/10 bg-dark-900 p-5 shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-primary-600/60 hover:shadow-primary-900/30"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-600/15 text-primary-500">
                <stat.icon className="h-5 w-5" />
              </span>
              <span className="text-2xl font-extrabold tabular-nums text-heading">
                {stat.value}
              </span>
            </div>
            <p className="mt-3 truncate text-sm font-semibold text-neutral-400">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Recent sections */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {recentSections.map((section) => (
          <div
            key={section.title}
            className="flex flex-col rounded-2xl border border-ink/10 bg-dark-900 p-6 shadow-lg shadow-black/20"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-600/15 text-primary-500">
                <section.icon className="h-5 w-5" />
              </span>
              <h3 className="text-base font-bold text-heading">
                {section.title}
              </h3>
            </div>
            <div className="mt-5 flex flex-1 items-center justify-center rounded-xl border border-dashed border-ink/15 bg-dark-950/60 px-4 py-8 text-center">
              <p className="text-xs leading-relaxed text-neutral-500">
                {section.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="mt-6 rounded-2xl border border-ink/10 bg-dark-900 p-6 shadow-lg shadow-black/20">
        <h3 className="text-base font-bold text-heading">Quick Actions</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "General Settings", href: "/admin/settings" },
            { label: "Logo & Favicon", href: "/admin/branding" },
            { label: "Courses Section", href: "/admin/homepage-courses" },
            { label: "All Courses", href: "/admin/courses" },
          ].map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="group flex items-center justify-between gap-3 rounded-xl border border-ink/15 bg-ink/5 px-4 py-3 text-sm font-semibold text-heading transition hover:border-primary-500/60 hover:bg-ink/10"
            >
              {action.label}
              <ArrowUpRightIcon className="h-4 w-4 shrink-0 text-neutral-500 transition group-hover:text-primary-400" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
