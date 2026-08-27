"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

type CategoryCardProps = {
  href: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  image?: string | null;
  categoryId?: string | null;
  categorySlug?: string | null;
  initialCount?: number | null;
};

function formatAvailability(count: number): string {
  if (count === 0) return "No Course Is Available Now";
  if (count === 1) return "1 Course Is Available Now";
  return `${count} Courses Are Available Now`;
}

/**
 * Course category card — icon on the LEFT, course name beside it,
 * "Explore Course" below with a small centered arrow icon underneath.
 * The entire card is clickable.
 */
export default function CategoryCard({
  href,
  title,
  icon,
  image,
  categoryId,
  categorySlug,
  initialCount,
}: CategoryCardProps) {
  const [count, setCount] = useState<number | null>(initialCount ?? null);

  useEffect(() => {
    // If no category identifiers, nothing to fetch (e.g. static fallback cards).
    if (!categoryId && !categorySlug) return;
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/courses/category-counts", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as {
          counts: Record<string, number>;
          slugCounts: Record<string, number>;
        };
        if (cancelled) return;
        let next: number | null = null;
        if (categoryId && data.counts && data.counts[categoryId] !== undefined) {
          next = data.counts[categoryId];
        } else if (categorySlug && data.slugCounts && data.slugCounts[categorySlug.toLowerCase()] !== undefined) {
          next = data.slugCounts[categorySlug.toLowerCase()];
        } else if (categorySlug && data.slugCounts) {
          // Fallback: try prefix match (e.g. "ssc" matches "ssc-academic")
          const key = Object.keys(data.slugCounts).find((k) =>
            categorySlug.toLowerCase().includes(k) || k.includes(categorySlug.toLowerCase()),
          );
          if (key) next = data.slugCounts[key];
        }
        if (next !== null) setCount(next);
      } catch {
        // Keep previous count on error.
      }
    }
    load();
    const id = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [categoryId, categorySlug]);

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

      {/* Dynamic category-wise course availability — replaces static description */}
      <p
        className={`relative mt-3 line-clamp-2 text-sm font-semibold leading-relaxed ${
          count === null
            ? "text-neutral-500"
            : count === 0
              ? "text-neutral-400"
              : "text-emerald-400"
        }`}
      >
        {count === null ? "Loading..." : formatAvailability(count)}
      </p>

      {/* Single rounded-square action button — text and arrow together. */}
      <div className="relative mt-auto pt-6">
        <span className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-primary-900/40 transition duration-300 group-hover:bg-primary-700 group-hover:shadow-primary-900/60">
          Explore Course
          <svg
            className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
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
