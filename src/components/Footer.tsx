import Link from "next/link";
import Logo from "@/components/Logo";
import { mainNavLinks } from "@/lib/nav-links";
import { getWebsiteSettingsWithFallback } from "@/lib/website-settings";

export default async function Footer() {
  const settings = await getWebsiteSettingsWithFallback();
  const footerLinks =
    settings.footerLinks && settings.footerLinks.length > 0
      ? settings.footerLinks
      : mainNavLinks.map((link) => ({ label: link.label, href: link.href }));

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

        {settings.showPrograms && (
          <div>
            <h3 className="text-sm font-semibold text-heading">Programs</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>HSC Academic</li>
              <li>Medical Admission</li>
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
              {settings.facebookUrl && (
                <li>
                  <a
                    href={settings.facebookUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="transition hover:text-primary-400"
                  >
                    Facebook
                  </a>
                </li>
              )}
              {settings.youtubeUrl && (
                <li>
                  <a
                    href={settings.youtubeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="transition hover:text-primary-400"
                  >
                    YouTube
                  </a>
                </li>
              )}
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
