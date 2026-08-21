import Link from "next/link";
import { adminCategories } from "@/lib/admin-nav";
import { ArrowRightIcon } from "@/components/admin/icons";

export default function AdminHome() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 sm:text-3xl">
          Welcome back, Admin 👋
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-zinc-500 sm:text-base">
          Manage and control your entire MediSpark website from one place.
        </p>
      </div>

      {/* Category cards */}
      <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {adminCategories.map((category) => (
          <Link
            key={category.href}
            href={category.href}
            className="group flex h-full flex-col rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-primary-600/50 hover:shadow-xl hover:shadow-black/10"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600/10 text-primary-600 transition duration-300 group-hover:bg-primary-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-primary-900/30">
              <category.icon className="h-7 w-7" />
            </span>

            <h3 className="mt-5 text-lg font-extrabold text-zinc-900 transition group-hover:text-primary-700">
              {category.name}
            </h3>
            <p className="mt-1.5 flex-1 text-sm leading-relaxed text-zinc-500">
              {category.description}
            </p>

            <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-primary-600">
              Manage
              <ArrowRightIcon className="h-4 w-4 transition duration-300 group-hover:translate-x-1" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
