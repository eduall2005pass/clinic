import Link from "next/link";

function EkgLine() {
  return (
    <svg
      viewBox="0 0 240 48"
      className="h-12 w-full text-primary-500/80"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      preserveAspectRatio="none"
    >
      <path d="M0 24h52l8-16 10 32 10-32 8 16h52l8-16 10 32 10-32 8 16h64" />
    </svg>
  );
}

function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-primary-600/25 to-primary-950/20 blur-2xl" />

      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-dark-900/80 p-5 shadow-2xl backdrop-blur sm:p-6">
        <div className="pointer-events-none absolute inset-0 bg-medical-cross opacity-70" />

        <div className="relative flex h-64 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-primary-700 via-primary-900 to-dark-950 sm:h-72">
          <div className="absolute inset-0 bg-medical-dots opacity-50" />
          <div className="absolute inset-x-6 bottom-5 opacity-90">
            <EkgLine />
          </div>
          <svg viewBox="0 0 160 160" className="relative h-40 w-40 sm:h-44 sm:w-44">
            <defs>
              <linearGradient id="heroCross" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#fca5a5" />
              </linearGradient>
            </defs>
            <rect x="62" y="16" width="36" height="128" rx="12" fill="url(#heroCross)" />
            <rect x="16" y="62" width="128" height="36" rx="12" fill="url(#heroCross)" />
            <path
              d="M36 86h26l10-22 14 44 10-22h28"
              fill="none"
              stroke="#7f1d1d"
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="absolute left-4 top-4 rounded-full bg-black/40 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
            HSC + Admission
          </span>
        </div>

        <div className="relative mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-primary-500/40 hover:bg-white/[0.07]">
            <svg
              className="h-6 w-6 text-primary-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
              />
            </svg>
            <p className="mt-2 text-sm font-semibold text-white">
              Structured Courses
            </p>
            <p className="mt-1 text-xs text-neutral-400">
              Chapter-based lessons
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-primary-500/40 hover:bg-white/[0.07]">
            <svg
              className="h-6 w-6 text-primary-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h6m-6 4h6M9 8h2m-6.75 12h13.5a1.5 1.5 0 001.5-1.5V5.25a1.5 1.5 0 00-1.5-1.5H12L9 6H5.25A1.5 1.5 0 003 7.5v13.5a1.5 1.5 0 001.5 1.5z"
              />
            </svg>
            <p className="mt-2 text-sm font-semibold text-white">Model Exams</p>
            <p className="mt-1 text-xs text-neutral-400">
              Practice &amp; track progress
            </p>
          </div>
        </div>
      </div>

      <div className="absolute -left-6 top-20 hidden rounded-xl border border-white/10 bg-dark-900/90 px-4 py-3 shadow-xl backdrop-blur sm:block">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
            <svg
              className="h-4 w-4 text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"
              />
            </svg>
          </span>
          <div>
            <p className="text-xs font-semibold text-white">Expert Q&amp;A</p>
            <p className="text-[11px] text-neutral-400">Ask anything</p>
          </div>
        </div>
      </div>

      <div className="absolute -right-4 bottom-24 hidden rounded-xl border border-white/10 bg-dark-900/90 px-4 py-3 shadow-xl backdrop-blur sm:block">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
            <svg
              className="h-4 w-4 text-white"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <rect x="9.5" y="3" width="5" height="18" rx="1.5" />
              <rect x="3" y="9.5" width="18" height="5" rx="1.5" />
            </svg>
          </span>
          <div>
            <p className="text-xs font-semibold text-white">
              Medical Admission
            </p>
            <p className="text-[11px] text-neutral-400">Goal-focused prep</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-dark-950">
      <div className="pointer-events-none absolute -left-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-primary-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-48 -right-32 h-[30rem] w-[30rem] rounded-full bg-primary-900/40 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-24 hidden h-full w-32 opacity-60 lg:block bg-dna" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 pt-16 sm:px-6 sm:pb-28 sm:pt-24 lg:grid-cols-2">
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
          <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl xl:text-6xl">
            Learn Smarter. Prepare Better.{" "}
            <span className="bg-gradient-to-r from-primary-400 via-primary-500 to-primary-600 bg-clip-text text-transparent">
              Achieve Your Dream.
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-neutral-400">
            MediSpark brings HSC academics and medical admission preparation
            together — structured courses, model exams, and expert Q&amp;A in
            one clean platform.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/courses"
              className="rounded-xl bg-primary-600 px-6 py-3.5 text-center font-semibold text-white shadow-lg shadow-primary-900/40 transition hover:bg-primary-700 active:scale-[0.98]"
            >
              Explore Courses
            </Link>
            <Link
              href="/dashboard"
              className="rounded-xl border border-white/20 bg-white/5 px-6 py-3.5 text-center font-semibold text-white transition hover:border-primary-500/60 hover:bg-white/10"
            >
              Dashboard
            </Link>
          </div>
        </div>

        <div className="animate-fade-in [animation-delay:150ms]">
          <HeroVisual />
        </div>
      </div>
    </section>
  );
}