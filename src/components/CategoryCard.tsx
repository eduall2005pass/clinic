import Link from "next/link";
import type { ReactNode } from "react";

type CategoryCardProps = {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
};

export default function CategoryCard({
  href,
  title,
  description,
  icon,
}: CategoryCardProps) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-ink/10 bg-dark-900 p-8 shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-primary-600/60 hover:shadow-primary-900/30"
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary-600/10 blur-3xl transition duration-300 group-hover:bg-primary-600/20" />
      <div className="pointer-events-none absolute inset-0 bg-medical-dots opacity-30" />

      <div className="relative">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-600/15 text-primary-500 transition duration-300 group-hover:bg-primary-600 group-hover:text-heading group-hover:shadow-md group-hover:shadow-primary-900/50">
          {icon}
        </span>
        <h2 className="mt-6 text-2xl font-extrabold text-heading transition duration-300 group-hover:text-primary-400">
          {title}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-neutral-400">
          {description}
        </p>
      </div>

      <span className="relative mt-8 inline-flex items-center gap-2 text-sm font-bold text-primary-500 transition duration-300 group-hover:gap-3 group-hover:text-primary-400">
        Explore Courses
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          viewBox="0 0 24 24"
        >
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </svg>
      </span>
    </Link>
  );
}