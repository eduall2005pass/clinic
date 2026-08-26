import Link from "next/link";
import Logo from "@/components/Logo";
import { mainNavLinks } from "@/lib/nav-links";
import { getWebsiteSettingsWithFallback } from "@/lib/website-settings";
import { fetchActiveSocialLinks } from "@/lib/social-links";
import { getSocialPlatformIcon } from "@/components/social-icons";
import { fetchActiveCourseCategories } from "@/lib/course-categories-store";

export default async function Footer() {
  const [settings, socialLinks, programCategories] = await Promise.all([
    getWebsiteSettingsWithFallback(),
    fetchActiveSocialLinks(),
    fetchActiveCourseCategories(),
  ]);
  const footerLinks =
    settings.footerLinks && settings.footerLinks.length > 0
      ? settings.footerLinks
      : mainNavLinks.map((link) => ({ label: link.label, href: link.href }));

  // Programs column follows Admin-managed course categories; falls back to a
  // static list only when no categories exist.
  const programLinks =
    settings.showPrograms &&
    (programCategories.length > 0
      ? programCategories.map((category) => ({
          label: category.name,
          href: category.href,
        }))
      : [
          { label: "HSC Academic", href: "/courses/academic" },
          { label: "Medical Admission", href: "/courses/admission" },
        ]);

  return (
    <footer className="relative overflow-hidden border-t border-ink/10 bg-dark-950 text-neutral-400">
      <div className="pointer-events-none absolute inset-0 bg-medical-cross opacity-60" />
      <div className="pointer-events-none absolute -right-32 -top-32 h-72 w-72 rounded-full bg-primary-600/10 blur-3xl" />

      <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div>
          <Logo />
          <p className="mt-4 text-sm leading-relaxed">{settings.tagline}</p>
        </div>

        {settings.showExplore && (
          <div>
            <h3 className="text-sm font-semibold text-heading">Explore</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {footerLinks.map((link) => (
                <li key={link.href + link.label}>
                  {link.href.startsWith("/") ? (
                    <Link
                      href={link.href}
                      className="transition hover:text-primary-400"
                    >
                      {link.label}
                    </Link>
                  ) : (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      className="transition hover:text-primary-400"
                    >
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
              <li>
                <Link
                  href="/login"
                  className="transition hover:text-primary-400"
                >
                  Login
                </Link>
              </li>
            </ul>
          </div>
        )}

        {settings.showPrograms && programLinks && (
          <div>
            <h3 className="text-sm font-semibold text-heading">Programs</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {programLinks.map((link) => (
                <li key={link.href + link.label}>
                  <Link
                    href={link.href}
                    className="transition hover:text-primary-400"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>Model Tests</li>
              <li>Expert Q&amp;A</li>
            </ul>
          </div>
        )}

        {settings.showContact && (
          <div>
            <h3 className="text-sm font-semibold text-heading">Contact</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {settings.contactEmail && <li>{settings.contactEmail}</li>}
              {settings.contactPhone && <li>{settings.contactPhone}</li>}
              {settings.address && <li>{settings.address}</li>}
              {/* Social platforms come from Admin → Social Links
                  (social_links table; falls back to website_settings). */}
              {socialLinks.map((link) => {
                const icon = getSocialPlatformIcon(link.key);
                return (
                  <li key={link.key}>
                    <a
                      href={link.url ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={link.label}
                      title={link.label}
                      className="inline-flex items-center gap-2 transition hover:text-primary-400"
                    >
                      {icon ? (
                        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="h-4.5 w-4.5 h-[18px] w-[18px]">
                          <path d={icon} />
                        </svg>
                      ) : null}
                      <span className="sr-only sm:not-sr-only">{link.label}</span>
                    </a>
                  </li>
                );
              })}
              {(settings.otherContactLinks ?? []).map((link) => (
                <li key={link.href + link.label}>
                  {link.href.startsWith("/") ? (
                    <Link
                      href={link.href}
                      className="transition hover:text-primary-400"
                    >
                      {link.label}
                    </Link>
                  ) : (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      className="transition hover:text-primary-400"
                    >
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="relative border-t border-ink/10 py-6 text-center text-sm text-neutral-500">
        {settings.copyrightText ??
          `© ${new Date().getFullYear()} ${settings.siteName}. All rights reserved.`}
      </div>
    </footer>
  );
}
