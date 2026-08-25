import Link from "next/link";

/**
 * Admin Panel Home — exactly 12 control cards (2 columns × 6 rows on every
 * device), each with an icon on the left and the control name on the right.
 * Website-control sections mirror the Main Website structure page-by-page;
 * system sections follow their own defined flows.
 */
export const metadata = { title: "Admin Panel — MediSpark" };

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

export default function AdminHomePage() {
  return (
    <section className="mx-auto max-w-6xl px-3 py-10 sm:px-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-widest text-primary-500">
          Admin Panel
        </p>
        <h1 className="mt-2 text-2xl font-extrabold text-heading sm:text-3xl">
          MediSpark Management
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-400">
          The Main Website with full control. Pick a section — every change is
          saved to MySQL and appears on the Main Website immediately.
        </p>
      </header>

      {/* Exactly 2 columns × 6 rows on every device */}
      <nav className="mt-8 grid grid-cols-2 gap-3 sm:gap-4">
        {CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group flex min-h-[72px] items-center gap-3 overflow-hidden rounded-2xl border border-ink/10 bg-dark-900 p-3 shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-0.5 hover:border-primary-600/60 hover:shadow-primary-900/30 sm:min-h-[84px] sm:p-5"
          >
            <span
              aria-hidden
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-600/10 text-lg sm:h-12 sm:w-12 sm:text-2xl"
            >
              {card.icon}
            </span>
            <span className="min-w-0 flex-1 break-words text-sm font-extrabold leading-snug text-heading transition group-hover:text-primary-400 sm:text-base">
              {card.title}
            </span>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
              className="h-4 w-4 shrink-0 text-neutral-600 transition group-hover:text-primary-500"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ))}
      </nav>
    </section>
  );
}
