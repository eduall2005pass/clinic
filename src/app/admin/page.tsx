import Link from "next/link";
import { adminCategories } from "@/lib/admin-nav";
import { ArrowRightIcon, UserShieldIcon } from "@/components/admin/icons";

const adminProfileCard = {
  name: "Admin Profile",
  href: "/admin/profile",
  description: "View and manage your administrator account.",
  icon: UserShieldIcon,
};

export default function AdminHome() {
  const cards = [...adminCategories, adminProfileCard];

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

      {/* Category cards — exactly 10, fixed 2 columns on every device */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:gap-5">
        {cards.map((category) => (
          <Link
            key={category.href}
            href={category.href}
            aria-label={`Manage ${category.name}`}
            className="group flex h-full flex-col rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition-colors duration-300 admin-dark:border-zinc-800 admin-dark:bg-zinc-900 hover:-translate-y-1 hover:border-primary-600/50 hover:shadow-xl hover:shadow-black/10 active:scale-[0.98] sm:p-6"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-600/10 text-primary-600 transition duration-300 group-hover:bg-primary-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-primary-900/30 sm:h-14 sm:w-14 sm:rounded-2xl">
              <category.icon className="h-5 w-5 sm:h-7 sm:w-7" />
            </span>

            <span className="mt-3 block text-sm font-extrabold tracking-tight text-zinc-900 transition-colors duration-300 sm:mt-5 sm:text-lg admin-dark:text-zinc-50">
              {category.name}
            </span>
            <span className="mt-0.5 line-clamp-2 flex-1 text-xs leading-relaxed text-zinc-500 transition-colors duration-300 sm:mt-1.5 sm:text-sm admin-dark:text-zinc-400">
              {category.description}
            </span>

            <span className="mt-3 inline-flex items-center gap-1 self-start rounded-full border border-primary-600/20 bg-primary-600/5 px-2.5 py-1 text-[11px] font-bold text-primary-600 transition duration-300 group-hover:bg-primary-600 group-hover:text-white sm:mt-5 sm:px-3 sm:text-xs admin-dark:text-primary-400 admin-dark:group-hover:text-white">
              Manage
              <ArrowRightIcon className="h-3 w-3 transition duration-300 group-hover:translate-x-0.5 sm:h-3.5 sm:w-3.5" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
