import { fetchActiveSocialLinks } from "@/lib/social-links";
import { fetchHomepageSections } from "@/lib/homepage-sections";
import { getSocialPlatformIcon } from "@/components/social-icons";
import type { SocialPlatformKey } from "@/lib/social-links-constants";
import SectionHeading, { JoinIcon } from "@/components/home/SectionHeading";

const JOIN_PLATFORMS: Array<{
  key: SocialPlatformKey;
  description: string;
  buttonLabel: string;
}> = [
  {
    key: "facebook",
    description: "Follow us on Facebook",
    buttonLabel: "Follow on Facebook",
  },
  {
    key: "youtube",
    description: "Subscribe to our YouTube channel",
    buttonLabel: "Subscribe on YouTube",
  },
  {
    key: "telegram",
    description: "Join our Telegram community",
    buttonLabel: "Join on Telegram",
  },
];

export default async function JoinWithUs({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  title: _titleProp,
  description: descriptionProp,
}: {
  title?: string;
  description?: string;
} = {}) {
  const [activeLinks, sections] = await Promise.all([
    fetchActiveSocialLinks(),
    fetchHomepageSections().catch(() => [] as any),
  ]);
  // Respect homepage_sections toggle — if join-with-us is disabled, hide section entirely
  const joinSection = (sections as any[])?.find((s: any) => s.key === "join-with-us" || s.section_key === "join-with-us");
  if (joinSection && joinSection.isActive === false) return null;
  // Heading is fixed to "Join With Us Now!" per design spec; description remains DB-driven
  const description = descriptionProp ?? joinSection?.description ?? "Connect with MediSpark on your favourite platforms and never miss an update.";

  // Only the 3 required platforms, in defined order, enabled + has URL
  const visible = JOIN_PLATFORMS.map((p) => {
    const found = activeLinks.find((l) => l.key === p.key);
    if (!found || !found.url) return null;
    return { ...p, url: found.url, label: found.label };
  }).filter(Boolean) as Array<{ key: string; description: string; buttonLabel: string; url: string; label: string }>;

  if (visible.length === 0) return null;

  return (
    <section id="join-with-us" className="scroll-mt-24 border-t border-ink/5 bg-dark-950">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <SectionHeading icon={JoinIcon}>Join With Us Now!</SectionHeading>
        {description ? (
          <p className="mx-auto mt-3 max-w-3xl text-center text-sm leading-relaxed text-neutral-400">
            {description}
          </p>
        ) : null}

        <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-4 sm:gap-5 md:grid-cols-3">
          {visible.map((platform) => {
            const iconPath = getSocialPlatformIcon(platform.key);
            return (
              <a
                key={platform.key}
                href={platform.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col rounded-2xl border border-ink/10 bg-dark-900 p-6 text-center shadow-lg shadow-black/20 transition duration-300 hover:border-primary-600/50 hover:shadow-primary-900/20 hover:-translate-y-1"
              >
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600/15 text-primary-500 transition group-hover:bg-primary-600 group-hover:text-white group-hover:shadow-md group-hover:shadow-primary-900/40">
                  {iconPath ? (
                    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="h-7 w-7">
                      <path d={iconPath} />
                    </svg>
                  ) : (
                    <span className="text-sm font-bold">{platform.label.charAt(0)}</span>
                  )}
                </span>
                <h3 className="mt-4 text-base font-extrabold text-heading">{platform.label}</h3>
                <p className="mt-1.5 min-h-10 text-sm leading-relaxed text-neutral-400">
                  {platform.description}
                </p>
                <span className="mt-5 inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-primary-900/30 transition group-hover:bg-primary-700">
                  {platform.buttonLabel}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 17L17 7M17 7H7m10 0v10" />
                  </svg>
                </span>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
