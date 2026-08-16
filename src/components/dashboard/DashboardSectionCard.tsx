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
      className="group flex flex-col rounded-2xl border border-white/10 bg-dark-900 p-6 shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-primary-600/60 hover:shadow-primary-900/30"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600/15 text-primary-500 transition group-hover:bg-primary-600 group-hover:text-white group-hover:shadow-md group-hover:shadow-primary-900/50">
        {section.icon}
      </span>
      <h3 className="mt-4 text-base font-bold text-white transition group-hover:text-primary-400">
        {section.title}
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-neutral-400">
        {section.description}
      </p>
    </Link>
  );
}