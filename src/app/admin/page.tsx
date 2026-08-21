import Link from "next/link";
import { adminCategories } from "@/lib/admin-nav";
import { ArrowRightIcon, DashboardIcon } from "@/components/admin/icons";

const dashboardCard = {
  name: "Dashboard",
  href: "/admin",
  description: "Overview of the entire platform at a glance.",
  icon: DashboardIcon,
};

export default function AdminHome() {
  const cards = [dashboardCard, ...adminCategories];

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 transition-colors duration-300 sm:text-3xl admin-dark:text-zinc-50">
          Welcome back, Admin 👋
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-zinc-500 transition-colors duration-300 sm:text-base admin-dark:text-zinc-400">
          Manage and control your entire MediSpark website from one place.
        </p>
      </div>

      {/* Category cards — exactly 10, 2 per row on desktop/tablet */}
      <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
        {cards.map((category) => (
          <Link
            key={category.href}
            href={category.href}
            aria-label={`Manage ${category.name}`}
            className="group flex h-full items-center gap-5 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm transition-colors duration-300 admin-dark:border-zinc-800 admin-dark:bg-zinc-900 hover:-translate-y-1 hover:border-primary-600/50 hover:shadow-xl hover:shadow-black/10"
          >
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-600/10 text-primary-600 transition duration-300 group-hover:bg-primary-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-primary-900/30">
              <category.icon className="h-7 w-7" />
            </span>

            <span className="min-w-0 flex-1">
              <span className="block text-lg font-extrabold tracking-tight text-zinc-900 transition-colors duration-300 admin-dark:text-zinc-50">
                {category.name}
              </span>
              <span className="mt-1 block truncate text-sm leading-relaxed text-zinc-500 transition-colors duration-300 admin-dark:text-zinc-400">
                {category.description}
              </span>
            </span>

            <span className="flex shrink-0 items-center gap-1.5 self-center rounded-full border border-primary-600/20 bg-primary-600/5 px-3 py-1.5 text-xs font-bold text-primary-600 transition duration-300 group-hover:bg-primary-600 group-hover:text-white admin-dark:text-primary-400 admin-dark:group-hover:text-white">
              Manage
              <ArrowRightIcon className="h-3.5 w-3.5 transition duration-300 group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
