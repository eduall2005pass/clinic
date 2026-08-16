import Link from "next/link";
import CourseCard from "@/components/CourseCard";
import { courses } from "@/lib/courses";

const sections = [
  {
    title: "Courses",
    description:
      "Chapter-based lessons across HSC subjects and medical admission syllabus.",
    href: "/courses",
  },
  {
    title: "Exam",
    description:
      "Model tests, chapter-wise exams and MCQ practice — coming step by step.",
    href: "/exam",
  },
  {
    title: "Q&A",
    description:
      "Ask questions and get answers from experts and fellow students.",
    href: "/qa",
  },
  {
    title: "Dashboard",
    description:
      "Track your progress and manage your personal information in one place.",
    href: "/dashboard",
  },
];

export default function HomePage() {
  return (
    <main className="flex-1">
      <section className="bg-gradient-to-br from-dark-950 via-dark-950 to-primary-950/60">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-block rounded-full border border-primary-500/40 bg-primary-500/10 px-4 py-1.5 text-sm font-medium text-primary-300">
              HSC Academic + Medical Admission Preparation
            </span>
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-white sm:text-6xl">
              Prepare for your future in{" "}
              <span className="bg-gradient-to-r from-primary-500 to-primary-700 bg-clip-text text-transparent">
                medicine
              </span>
            </h1>
            <p className="mt-6 text-lg text-neutral-400">
              MediSpark brings HSC academics and medical admission preparation
              together — courses, exams, and expert Q&A in one clean platform.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/courses"
                className="w-full rounded-xl bg-primary-600 px-6 py-3.5 font-semibold text-white transition hover:bg-primary-700 sm:w-auto"
              >
                Browse Courses
              </Link>
              <Link
                href="/exam"
                className="w-full rounded-xl border border-white/20 px-6 py-3.5 font-semibold text-white transition hover:border-white/40 hover:bg-white/5 sm:w-auto"
              >
                Explore Exams
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-primary-600">
              Inside MediSpark
            </p>
            <h2 className="mt-3 text-3xl font-extrabold text-dark-900">
              Everything you need, in one place
            </h2>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {sections.map((section) => (
              <Link
                key={section.href}
                href={section.href}
                className="group rounded-2xl border border-neutral-200 bg-white p-6 transition hover:-translate-y-1 hover:border-primary-500 hover:shadow-lg"
              >
                <h3 className="font-bold text-dark-900 transition group-hover:text-primary-700">
                  {section.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                  {section.description}
                </p>
                <span className="mt-4 inline-block text-sm font-semibold text-primary-600">
                  Explore →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-neutral-50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-primary-600">
              Featured Subjects
            </p>
            <h2 className="mt-3 text-3xl font-extrabold text-dark-900">
              Start with your core subjects
            </h2>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <CourseCard key={course.slug} course={course} />
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link
              href="/courses"
              className="inline-block rounded-xl border-2 border-primary-600 px-6 py-3 font-semibold text-primary-600 transition hover:bg-primary-600 hover:text-white"
            >
              View All Courses
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-r from-primary-700 to-primary-800">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 py-14 text-center sm:px-6 md:flex-row md:text-left">
          <div>
            <h2 className="text-2xl font-extrabold text-white sm:text-3xl">
              Start your preparation journey
            </h2>
            <p className="mt-2 text-primary-100">
              Explore what MediSpark offers and get ready for admission.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/courses"
              className="rounded-xl bg-white px-6 py-3 font-semibold text-primary-700 transition hover:bg-primary-50"
            >
              Browse Courses
            </Link>
            <Link
              href="/login"
              className="rounded-xl border-2 border-white/60 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
            >
              Login
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}