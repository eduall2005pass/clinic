import Link from "next/link";
import type { ReactNode } from "react";

type CategoryCardProps = {
  href: string;
  title: string;
  description: string;
  icon?: ReactNode;
  image?: string | null;
};

/**
 * Course category card — icon on the LEFT, course name beside it,
 * "Explore Course" below with a small centered arrow icon underneath.
 * The entire card is clickable.
 */
export default function CategoryCard({
  href,
  title,
  description,
  icon,
  image,
}: CategoryCardProps) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-ink/10 bg-dark-900 p-6 shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-primary-600/60 hover:shadow-primary-900/30 active:scale-[0.99]"
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary-600/10 blur-3xl transition duration-300 group-hover:bg-primary-600/20" />
      <div className="pointer-events-none absolute inset-0 bg-medical-dots opacity-30" />

      {/* Icon on the left, course name beside it. */}
      <div className="relative flex items-center gap-4">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt=""
            className="h-14 w-14 shrink-0 rounded-2xl object-cover transition duration-300 group-hover:shadow-md group-hover:shadow-primary-900/50"
          />
        ) : (
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-600/15 text-primary-500 transition duration-300 group-hover:bg-primary-600 group-hover:text-heading group-hover:shadow-md group-hover:shadow-primary-900/50">
            {icon ?? null}
          </span>
        )}
        <h2 className="text-lg font-extrabold leading-snug text-heading transition duration-300 group-hover:text-primary-400 sm:text-xl">
          {title}
        </h2>
      </div>

      {description && (
        <p className="relative mt-3 line-clamp-2 text-sm leading-relaxed text-neutral-400">
          {description}
        </p>
      )}

      {/* Explore Course — clearly separated, arrow centered underneath. */}
      <div className="relative mt-auto flex flex-col items-center gap-2 pt-6">
        <span className="text-sm font-bold text-primary-400 transition duration-300 group-hover:text-primary-300">
          Explore Course
        </span>
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-primary-600/40 bg-primary-600/10 text-primary-400 transition duration-300 group-hover:bg-primary-600 group-hover:text-white group-hover:shadow-md group-hover:shadow-primary-900/50">
          <svg
            className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            viewBox="0 0 24 24"
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </span>
      </div>
    </Link>
  );
}
