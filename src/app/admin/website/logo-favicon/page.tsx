import type { Metadata } from "next";
import LogoManager from "@/components/admin/LogoManager";
import FaviconManager from "@/components/admin/FaviconManager";

export const metadata: Metadata = {
  title: "Logo & Favicon — MediSpark Admin",
  description:
    "View, upload, replace and restore the website logo and favicon. Changes go live immediately.",
};

export default function LogoFaviconPage() {
  return (
    <main className="flex-1 bg-[#f1f5f9] admin-dark:bg-[#0a162e]">
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <header>
          <p className="text-xs font-bold uppercase tracking-widest text-primary-500">
            Admin Panel — Website
          </p>
          <h1 className="mt-2 text-3xl font-extrabold text-heading">
            Logo &amp; Favicon
          </h1>
          <p className="mt-2 text-sm text-neutral-400">
            Manage the website logo and browser favicon. Changes are stored in
            MySQL and apply immediately across the live website. Only
            authorized administrators can change these.
          </p>
        </header>

        <div className="mt-8 space-y-6">
          <LogoManager />
          <FaviconManager />
        </div>
      </section>
    </main>
  );
}
