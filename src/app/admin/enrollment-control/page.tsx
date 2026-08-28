"use client";

import Link from "next/link";
import {
  PendingIndicator,
  useEnrollmentPendingTotals,
} from "@/components/admin/EnrollmentControlShared";

/**
 * Enrollment Control — main page. 3 cards:
 * Free Course, Paid Course and Payment Card.
 * Free/Paid cards glow when any course inside has pending applications.
 */
const CARDS = [
  {
    href: "/admin/enrollment-control/free",
    icon: "🆓",
    title: "Free Course Enrollment",
    description: "Auto Enrollment ON/OFF + course-wise applications.",
  },
  {
    href: "/admin/enrollment-control/paid",
    icon: "💳",
    title: "Paid Course Enrollment",
    description: "Course-wise enrollment applications for paid courses.",
  },
  {
    href: "/admin/enrollment-control/payment-card",
    icon: "📱",
    title: "Payment Card",
    description: "bKash/Nagad numbers + payment instructions with live preview.",
  },
];

export default function EnrollmentControlPage() {
  const { freePending, paidPending } = useEnrollmentPendingTotals();
  const pendingFor: Record<string, number> = {
    "/admin/enrollment-control/free": freePending,
    "/admin/enrollment-control/paid": paidPending,
  };

  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-extrabold text-heading">Enrollment Control</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Manage Free and Paid Course enrollments course-by-course.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group relative flex min-h-[110px] flex-col justify-center gap-2 rounded-2xl border border-[#dbeafe] bg-white shadow-sm shadow-[#0b1e3a]/5 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] p-4 shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-0.5 hover:border-primary-600/60 hover:shadow-primary-900/30 sm:min-h-[140px] sm:p-6"
          >
            <PendingIndicator
              count={pendingFor[card.href] ?? 0}
              className="right-3 top-3"
            />
            <span aria-hidden className="text-2xl sm:text-3xl">{card.icon}</span>
            <span className="break-words text-sm font-extrabold leading-snug text-heading transition group-hover:text-[#1a3a78] sm:text-lg">
              {card.title}
            </span>
            <span className="hidden text-xs text-neutral-400 sm:block">
              {card.description}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}