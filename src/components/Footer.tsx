import Link from "next/link";
import Logo from "@/components/Logo";
import { mainNavLinks, loginHref } from "@/lib/nav-links";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-dark-950 text-neutral-400">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div>
          <Logo light />
          <p className="mt-4 text-sm leading-relaxed">
            HSC academic & medical admission preparation platform built for
            future medical students.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white">Explore</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            {mainNavLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="transition hover:text-white">
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href={loginHref}
                className="transition hover:text-white"
              >
                Login
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white">Programs</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>HSC Academic</li>
            <li>Medical Admission</li>
            <li>Model Tests</li>
            <li>Expert Q&A</li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white">Contact</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>support@medispark.com</li>
            <li>hello@medispark.com</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 py-6 text-center text-sm text-neutral-500">
        © {new Date().getFullYear()} MediSpark. All rights reserved.
      </div>
    </footer>
  );
}