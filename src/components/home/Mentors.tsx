import SectionHeader from "@/components/SectionHeader";
import { fetchMentors } from "@/lib/mentors";
import type { Mentor } from "@/lib/mentors";

function socialLinks(mentor: Mentor): Array<{ label: string; href: string }> {
  const links = [
    { label: "Facebook", href: mentor.socialFacebook },
    { label: "Instagram", href: mentor.socialInstagram },
    { label: "LinkedIn", href: mentor.socialLinkedin },
    { label: "YouTube", href: mentor.socialYoutube },
  ];
  return links.filter((link): link is { label: string; href: string } =>
    Boolean(link.href),
  );
}

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
                className="group rounded-2xl border border-ink/10 bg-dark-900 p-6 text-center shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-primary-600/60 hover:shadow-primary-900/30"
              >
                <div className="mx-auto flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary-500 to-primary-800 text-xl font-extrabold text-white shadow-lg shadow-primary-900/40 transition group-hover:shadow-primary-800/50">
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
                <h3 className="mt-4 font-bold text-heading">{mentor.name}</h3>
                <p className="mt-1 text-sm font-medium text-primary-400">
                  {mentor.subject}
                </p>
                {(mentor.note || mentor.bio) && (
                  <p className="mt-3 text-sm leading-relaxed text-neutral-400">
                    {mentor.bio || mentor.note}
                  </p>
                )}
                {socialLinks(mentor).length > 0 && (
                  <div className="mt-4 flex items-center justify-center gap-2">
                    {socialLinks(mentor).map((link) => (
                      <a
                        key={link.label}
                        href={link.href}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`${mentor.name} on ${link.label}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink/10 bg-dark-950 text-[11px] font-bold uppercase text-neutral-400 transition hover:border-primary-500/50 hover:text-primary-400"
                      >
                        {link.label.charAt(0)}
                      </a>
                    ))}
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
