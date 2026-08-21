import Link from "next/link";
import SectionHeader from "@/components/SectionHeader";
import { fetchHomepageCourses } from "@/lib/homepage-courses";
import { HOMEPAGE_COURSE_DEFAULTS } from "@/lib/homepage-courses-constants";

export default async  function HomepageCourses({
  title,
  description,
}: {
  title?: string;
  description?: string;
} = {}) {
  const cards = await fetchHomepageCourses();
  const activeCards = cards.filter((c) => c.isActive);

  // If no active cards, show nothing or fallback to defaults for preview
  const display = activeCards.length > 0 ? activeCards : cards;

  // Ensure at least showing something; if DB not configured, defaults will have no images
  if (display.length === 0) return null;

  return (
    <section id="homepage-courses" className="border-t border-ink/5 bg-dark-950">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <SectionHeader
          label="Our Courses"
          title={title ?? "Explore Our Courses"}
          description={description ?? "Choose your track — SSC, HSC or Medical Admission. Every course is built for your next achievement."}
        />

        <div className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {display.map((card) => {
            const fallback = HOMEPAGE_COURSE_DEFAULTS[card.slug];
            const image = card.imageUrl ?? fallback.imageUrl ?? null;
            return (
              <article
                key={card.slug}
                className="group flex flex-col overflow-hidden rounded-2xl border border-ink/10 bg-dark-900 shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-primary-600/60 hover:shadow-primary-900/30"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-dark-950">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={image}
                      alt={card.title}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-600/20 via-dark-900 to-dark-950 p-6">
                      <span className="text-center text-sm font-semibold text-primary-400/80">
                        {card.slug.toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-dark-950/60 via-transparent to-transparent" />
                  <span
                    className={`absolute left-4 top-4 rounded-full border px-3 py-1 text-xs font-bold backdrop-blur ${
                      card.slug === "ssc"
                        ? "border-emerald-500/40 bg-dark-950/80 text-emerald-400"
                        : card.slug === "hsc"
                          ? "border-sky-500/40 bg-dark-950/80 text-sky-400"
                          : "border-rose-500/40 bg-dark-950/80 text-rose-400"
                    }`}
                  >
                    {card.slug === "ssc" ? "SSC" : card.slug === "hsc" ? "HSC" : "MEDICAL"}
                  </span>
                </div>

                <div className="flex flex-1 flex-col p-6">
                  <h3 className="text-lg font-bold text-heading transition group-hover:text-primary-400 line-clamp-2">
                    {card.title}
                  </h3>
                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-neutral-400">
                    {card.description || fallback.description}
                  </p>

                  <div className="mt-6">
                    <Link
                      href={card.buttonHref || fallback.buttonHref}
                      className="inline-flex w-full items-center justify-center rounded-xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-primary-900/30 transition hover:bg-primary-700 active:scale-[0.98]"
                    >
                      {card.buttonText || fallback.buttonText}
                      <svg
                        className="ml-2 h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        viewBox="0 0 24 24"
                      >
                        <path d="M5 12h14" />
                        <path d="m12 5 7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {activeCards.length === 0 && (
          <p className="mt-8 text-center text-xs text-neutral-600">
            All courses are currently hidden. Enable them from Admin Panel → Homepage Courses.
          </p>
        )}
      </div>
    </section>
  );
}
