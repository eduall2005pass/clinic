import SectionHeader from "@/components/SectionHeader";
import { fetchMentors } from "@/lib/mentors";

export default async function Mentors({
  title,
  description,
}: {
  title?: string;
  description?: string;
} = {}) {
  const mentors = (await fetchMentors()).filter((mentor) => mentor.isActive);

  return (
    <section id="mentors" className="relative scroll-mt-24 overflow-hidden border-t border-ink/5 bg-dark-950">
      <div className="pointer-events-none absolute -left-32 top-24 h-72 w-72 rounded-full bg-primary-600/10 blur-3xl" />
      <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <SectionHeader
          label="Our Mentors"
          title={title ?? "Learn from experienced mentors"}
          description={description ?? "Mentor profiles will grow as the platform expands."}
        />

        {mentors.length === 0 ? (
          <p className="mt-12 text-center text-sm text-neutral-500">
            Mentor profiles are coming soon.
          </p>
        ) : (
          <div className="mx-auto mt-12 grid max-w-4xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {mentors.map((mentor) => (
              <article
                key={mentor.id}
                className="group rounded-2xl border border-ink/10 bg-dark-900 p-6 text-center shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-primary-600/60 hover:shadow-primary-900/30 sm:p-7"
              >
                {/* Profile photo — rounded-square, clean modern corners */}
                <div className="mx-auto flex h-32 w-32 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-primary-500 to-primary-800 text-2xl font-extrabold text-white shadow-lg shadow-primary-900/40 transition group-hover:shadow-primary-800/50">
                  {mentor.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={mentor.photoUrl}
                      alt={mentor.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    mentor.initials
                  )}
                </div>

                {/* Name */}
                <h3 className="mt-5 text-lg font-extrabold leading-snug text-heading">
                  {mentor.name}
                </h3>

                {/* Qualification */}
                {mentor.qualification ? (
                  <p className="mt-1.5 text-sm font-semibold text-neutral-300">
                    {mentor.qualification}
                  </p>
                ) : null}

                {/* Role / subject — small rounded-square container,
                    centered, matching the designation containers below. */}
                {mentor.subject ? (
                  <p className="mt-3 flex justify-center">
                    <span className="inline-flex max-w-[240px] items-center justify-center rounded-xl border border-primary-500/40 bg-dark-950 px-4 py-2 text-xs font-bold tracking-wide text-primary-400">
                      {mentor.subject}
                    </span>
                  </p>
                ) : null}

                {/* Designations — enabled ones only, vertically stacked,
                    centered rounded-square text containers (not badges).
                    All three share one identical new design, separate from
                    the Subject Teacher container above. */}
                {(mentor.isFounder ||
                  mentor.isCoFounder ||
                  mentor.isDeveloper) && (
                  <div className="mt-5 flex flex-col items-center gap-2.5">
                    {mentor.isFounder && (
                      <span className="inline-flex w-full max-w-[240px] items-center justify-center rounded-xl border border-blue-500/40 bg-blue-600/10 px-4 py-2 text-xs font-bold tracking-wide text-blue-400">
                        Founder of MediSpark
                      </span>
                    )}
                    {mentor.isCoFounder && (
                      <span className="inline-flex w-full max-w-[240px] items-center justify-center rounded-xl border border-blue-500/40 bg-blue-600/10 px-4 py-2 text-xs font-bold tracking-wide text-blue-400">
                        Co-Founder of MediSpark
                      </span>
                    )}
                    {mentor.isDeveloper && (
                      <span className="inline-flex w-full max-w-[240px] items-center justify-center rounded-xl border border-blue-500/40 bg-blue-600/10 px-4 py-2 text-xs font-bold tracking-wide text-blue-400">
                        Developer of MediSpark
                      </span>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
