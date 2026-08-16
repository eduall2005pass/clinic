export default function Hero() {
  return (
    <section className="px-4 pt-8 sm:px-6 sm:pt-12">
      <div className="animate-fade-up relative mx-auto flex max-w-3xl items-center gap-4 overflow-hidden rounded-2xl border border-primary-200/60 bg-gradient-to-br from-primary-50 via-primary-100 to-primary-200 px-5 py-5 shadow-sm sm:gap-5 sm:px-8 sm:py-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/70 ring-1 ring-primary-200/70 sm:h-11 sm:w-11">
          <svg
            className="h-4 w-4 text-primary-700 sm:h-[1.125rem] sm:w-[1.125rem]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 3 2 7.5 12 12l10-4.5L12 3Z" />
            <path d="M6 9.8v3.4c0 1.6 2.7 3 6 3s6-1.4 6-3V9.8" />
            <path d="M22 9.3V13" />
            <path d="M12 5.6v3.8M10.1 7.5h3.8" />
          </svg>
        </div>
        <p className="text-base font-semibold leading-snug text-black sm:text-lg">
          A dedicated platform for academic and admission courses.
        </p>
      </div>
    </section>
  );
}