import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-dark-950">
      <div className="pointer-events-none absolute -left-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-primary-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-48 -right-32 h-[30rem] w-[30rem] rounded-full bg-primary-900/40 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-24 hidden h-full w-32 opacity-60 lg:block bg-dna" />

      <div className="relative mx-auto max-w-3xl px-4 pb-20 pt-10 text-center sm:px-6 sm:pb-28 sm:pt-16">
        <div className="animate-fade-up">
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-heading sm:text-5xl xl:text-6xl">
            Learn Smarter. Prepare Better.{" "}
            <span className="bg-gradient-to-r from-primary-400 via-primary-500 to-primary-600 bg-clip-text text-transparent">
              Achieve Your Dream.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-neutral-400">
            পড়াশোনা হোক আরও সহজ, প্রস্তুতি হোক আরও স্মার্ট। এইচএসসি একাডেমিক
            ও মেডিকেল অ্যাডমিশনের জন্য কোর্স, পরীক্ষা ও এক্সপার্ট সাপোর্ট—সবকিছু
            এখন এক জায়গায়।
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
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