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
      {/* Category intro — Navy */}
      <div className="flex items-center gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#1a3a78] text-white shadow-lg shadow-[#0b1e3a]/20 ring-1 ring-[#0b1e3a]/10 admin-dark:bg-[#234e9f]">
          <category.icon className="h-7 w-7" />
        </span>
        <div className="min-w-0">
          <h2 className="text-xl font-extrabold tracking-tight text-[#0b1e3a] transition-colors duration-300 sm:text-2xl admin-dark:text-white">
            {category.name} Management
          </h2>
          <p className="mt-0.5 text-sm text-slate-500 admin-dark:text-[#8da0c0]">
            {category.description}
          </p>
        </div>
      </div>

      {/* Sub-section cards — Unified Smart Card */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {category.subsections.map((sub) => (
          <Link
            key={sub.href + sub.label}
            href={sub.href}
            className="group flex items-center justify-between gap-3 rounded-2xl border border-[#dbeafe] bg-white px-5 py-4 shadow-sm shadow-[#0b1e3a]/5 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#93c5fd] hover:shadow-md hover:shadow-[#0b1e3a]/10 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] admin-dark:shadow-black/20 admin-dark:hover:border-[#2f5aa0]"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold text-[#0b1e3a] transition group-hover:text-[#1a3a78] admin-dark:text-white admin-dark:group-hover:text-[#93c5fd]">
                {sub.label}
              </span>
              <span className="mt-0.5 block text-xs text-slate-400 admin-dark:text-[#8da0c0]">
                Manage {sub.label.toLowerCase()}
              </span>
            </span>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#eff6ff] text-[#1a3a78] ring-1 ring-[#dbeafe] transition group-hover:bg-[#1a3a78] group-hover:text-white group-hover:ring-[#1a3a78] admin-dark:bg-[#0f2547] admin-dark:text-[#93c5fd] admin-dark:ring-[#1e3a65] admin-dark:group-hover:bg-[#234e9f]">
              <ArrowUpRightIcon className="h-4 w-4" />
            </span>
          </Link>
        ))}
      </div>

      {/* Coming soon note */}
      <p className="mt-10 rounded-2xl border border-dashed border-[#bfdbfe] bg-[#f8fbff]/70 px-5 py-4 text-center text-xs leading-relaxed text-slate-500 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544]/60 admin-dark:text-[#8da0c0]">
        These sections are part of the new Website Control Center. Data
        management will be connected to MySQL in upcoming steps — website
        content will then update live from this panel.
      </p>
    </section>
  );
}
