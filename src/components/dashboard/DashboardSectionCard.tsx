import Link from "next/link";
import type { DashboardSection } from "@/lib/dashboard";

export default function DashboardSectionCard({
  section,
}: {
  section: DashboardSection;
}) {
  return (
    <Link
      href={section.href}
      className="group flex items-center gap-4 rounded-2xl border border-ink/10 bg-dark-900 p-5 shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-primary-600/60 hover:shadow-primary-900/30"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-600/15 text-primary-500 transition group-hover:bg-primary-600 group-hover:text-heading group-hover:shadow-md group-hover:shadow-primary-900/50">
        {section.icon}
      </span>
      <div className="min-w-0">
        <h3 className="text-base font-bold text-heading transition group-hover:text-primary-400">
          {section.title}
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-neutral-400">
          {section.description}
        </p>
      </div>
    </Link>
  );
}