import Link from "next/link";

export default function FinalCTA() {
  return (
    <section className="relative overflow-hidden border-t border-white/5 bg-dark-950">
      <div className="pointer-events-none absolute inset-0 bg-medical-cross opacity-50" />
      <div className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 sm:pb-28">
        <div className="relative overflow-hidden rounded-3xl border border-primary-600/40 bg-gradient-to-br from-primary-900 via-dark-900 to-dark-950 px-6 py-14 text-center shadow-2xl shadow-primary-900/30 sm:px-12 sm:py-16">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary-600/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-primary-900/40 blur-3xl" />
          <div className="pointer-events-none absolute inset-0 bg-medical-dots opacity-30" />

          <h2 className="relative text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Start Your Learning Journey Today
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-primary-100/80">
            Join MediSpark and begin preparing for your future in medicine.
          </p>
          <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/courses"
              className="w-full rounded-xl bg-primary-600 px-6 py-3.5 font-semibold text-white shadow-lg shadow-primary-900/50 transition hover:bg-primary-700 active:scale-[0.98] sm:w-auto"
            >
              Explore Courses
            </Link>
            <Link
              href="/login"
              className="w-full rounded-xl border border-white/25 bg-white/5 px-6 py-3.5 font-semibold text-white transition hover:border-primary-500/60 hover:bg-white/10 sm:w-auto"
            >
              Login
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}