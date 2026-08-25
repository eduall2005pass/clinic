import Link from "next/link";

/**
 * Enrollment Control — main page. Exactly 2 cards:
 * Free Course Enrollment and Paid Course Enrollment.
 */
export const metadata = { title: "Enrollment Control — MediSpark Admin" };

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
];

export default function EnrollmentControlPage() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-extrabold text-heading">Enrollment Control</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Manage Free and Paid Course enrollments course-by-course.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4">
        {CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group flex min-h-[110px] flex-col justify-center gap-2 rounded-2xl border border-ink/10 bg-dark-900 p-4 shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-0.5 hover:border-primary-600/60 hover:shadow-primary-900/30 sm:min-h-[140px] sm:p-6"
          >
            <span aria-hidden className="text-2xl sm:text-3xl">{card.icon}</span>
            <span className="break-words text-sm font-extrabold leading-snug text-heading transition group-hover:text-primary-400 sm:text-lg">
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
