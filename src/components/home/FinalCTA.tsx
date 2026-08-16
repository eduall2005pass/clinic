import Link from "next/link";

export default function FinalCTA() {
  return (
    <section className="border-t border-white/5 bg-dark-950">
      <div className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 sm:pb-28">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-700 via-primary-800 to-dark-900 px-6 py-14 text-center sm:px-12 sm:py-16">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-black/30 blur-3xl" />

          <h2 className="relative text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Start Your Learning Journey Today
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-primary-100">
            Join MediSpark and begin preparing for your future in medicine.
          </p>
          <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/courses"
              className="w-full rounded-xl bg-white px-6 py-3.5 font-semibold text-primary-700 shadow-lg transition hover:bg-primary-50 sm:w-auto"
            >
              Explore Courses
            </Link>
            <Link
              href="/login"
              className="w-full rounded-xl border-2 border-white/60 px-6 py-3.5 font-semibold text-white transition hover:bg-white/10 sm:w-auto"
            >
              Login
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}