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
      className="group flex flex-col rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-primary-500 hover:shadow-lg"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-600 transition group-hover:bg-primary-600 group-hover:text-white">
        {section.icon}
      </span>
      <h3 className="mt-4 text-base font-bold text-dark-900 transition group-hover:text-primary-700">
        {section.title}
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-neutral-500">
        {section.description}
      </p>
    </Link>
  );
}