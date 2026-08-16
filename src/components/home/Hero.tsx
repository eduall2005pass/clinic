import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-dark-950">
      <div className="pointer-events-none absolute -left-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-primary-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-48 -right-32 h-[30rem] w-[30rem] rounded-full bg-primary-900/40 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-24 hidden h-full w-32 opacity-60 lg:block bg-dna" />

      <div className="relative mx-auto max-w-3xl px-4 pb-20 pt-16 text-center sm:px-6 sm:pb-28 sm:pt-24">
        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary-500/40 bg-primary-500/10 px-4 py-1.5 text-sm font-medium text-primary-300">
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 3a9 9 0 100 18 9 9 0 000-18zm-1.5 4.5h3V12h4.5v3h-4.5v4.5h-3V15h-4.5v-3h4.5V7.5z" />
            </svg>
            HSC Academic + Medical Admission Preparation
          </span>
          <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight text-heading sm:text-5xl xl:text-6xl">
            Learn Smarter. Prepare Better.{" "}
            <span className="bg-gradient-to-r from-primary-400 via-primary-500 to-primary-600 bg-clip-text text-transparent">
              Achieve Your Dream.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-neutral-400">
            MediSpark brings HSC academics and medical admission preparation
            together — structured courses, model exams, and expert Q&amp;A in
            one clean platform.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/courses"
              className="rounded-xl bg-primary-600 px-6 py-3.5 text-center font-semibold text-white shadow-lg shadow-primary-900/40 transition hover:bg-primary-700 active:scale-[0.98]"
            >
              Explore Courses
            </Link>
            <Link
              href="/dashboard"
              className="rounded-xl border border-ink/20 bg-ink/5 px-6 py-3.5 text-center font-semibold text-heading transition hover:border-primary-500/60 hover:bg-ink/10"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}