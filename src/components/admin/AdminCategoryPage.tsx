import Link from "next/link";
import type { AdminCategory } from "@/lib/admin-nav";
import { ArrowUpRightIcon } from "@/components/admin/icons";

export default function AdminCategoryPage({
  category,
}: {
  category: AdminCategory;
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      {/* Category intro */}
      <div className="flex items-center gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-lg shadow-primary-900/30">
          <category.icon className="h-7 w-7" />
        </span>
        <div className="min-w-0">
          <h2 className="text-xl font-extrabold tracking-tight text-zinc-900 sm:text-2xl">
            {category.name} Management
          </h2>
          <p className="mt-0.5 text-sm text-zinc-500">
            {category.description}
          </p>
        </div>
      </div>

      {/* Sub-section cards */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {category.subsections.map((sub) => (
          <Link
            key={sub.href + sub.label}
            href={sub.href}
            className="group flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white px-5 py-4 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-primary-600/50 hover:shadow-lg hover:shadow-black/10"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold text-zinc-900 transition group-hover:text-primary-700">
                {sub.label}
              </span>
              <span className="mt-0.5 block text-xs text-zinc-400">
                Manage {sub.label.toLowerCase()}
              </span>
            </span>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-zinc-500 transition duration-300 group-hover:bg-primary-600 group-hover:text-white">
              <ArrowUpRightIcon className="h-4 w-4" />
            </span>
          </Link>
        ))}
      </div>

      {/* Coming soon note */}
      <p className="mt-10 rounded-2xl border border-dashed border-neutral-300 bg-white/60 px-5 py-4 text-center text-xs leading-relaxed text-zinc-500">
        These sections are part of the new Website Control Center. Data
        management will be connected to MySQL in upcoming steps — website
        content will then update live from this panel.
      </p>
    </section>
  );
}
