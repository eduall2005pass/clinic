import Link from "next/link";

/**
 * Admin Panel Home — exactly 11 control cards, each opening its dedicated
 * management section. Website-control sections mirror the Main Website
 * structure page-by-page; system sections follow their own defined flows.
 */
export const metadata = { title: "Admin Panel — MediSpark" };

const CARDS: Array<{
  href: string;
  title: string;
  description: string;
}> = [
  {
    href: "/admin/enrollment-control",
    title: "Enrollment Control",
    description:
      "Free Course auto-enrollment ON/OFF · Paid flow: Category → Course → Student List with application status.",
  },
  {
    href: "/admin/home-control",
    title: "Home Control",
    description:
      "The live homepage with per-section Manage controls — banners, hero, courses, mentors, reviews, FAQ, jersey.",
  },
  {
    href: "/admin/course-control",
    title: "Course Control",
    description:
      "Same structure as the website Courses page — categories, course cards, fees and details. Add / Edit / Delete.",
  },
  {
    href: "/admin/course-content-control",
    title: "Course Content Control",
    description:
      "Course → Subject → Paper → Chapter → Class / Exam / Materials — page-by-page content management.",
  },
  {
    href: "/admin/public-exam-control",
    title: "Public Exam Control",
    description:
      "Public Exam section with the same category/list flow — exams, questions, answer keys, settings.",
  },
  {
    href: "/admin/qa-control",
    title: "Q&A Control",
    description: "Q&A section review — subjects, questions and teacher answers.",
  },
  {
    href: "/admin/dashboard-control",
    title: "Dashboard Control",
    description:
      "Student Dashboard management — enrolled courses, progress data, notifications and push.",
  },
  {
    href: "/admin/student-control",
    title: "Student Control",
    description:
      "All Students · Enrolled Students · Active / Inactive account management.",
  },
  {
    href: "/admin/result-control",
    title: "Result Control",
    description:
      "Public Exam results + Course Exam Result sheet: Total Mark, Obtained, Highest, Merit Position.",
  },
  {
    href: "/admin/notification-control",
    title: "Notification Control",
    description:
      "All Student · Enrolled Student · Specific Student notifications — send and manage.",
  },
  {
    href: "/admin/admin-center",
    title: "Admin Center",
    description: "All admin accounts and access / role management.",
  },
];

export default function AdminHomePage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
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

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group flex flex-col rounded-2xl border border-ink/10 bg-dark-900 p-5 shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-primary-600/60 hover:shadow-primary-900/30"
          >
            <h2 className="text-base font-extrabold text-heading transition group-hover:text-primary-400">
              {card.title}
            </h2>
            <p className="mt-2 flex-1 text-xs leading-relaxed text-neutral-400">
              {card.description}
            </p>
            <span className="mt-4 inline-flex w-fit items-center gap-1 text-xs font-bold text-primary-500 transition group-hover:gap-2">
              Open
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
