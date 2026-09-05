"use client";

import Link from "next/link";

const iconClass = "h-6 w-6";
const iconProps = {
  className: iconClass,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  viewBox: "0 0 24 24",
} as const;

const cards = [
  {
    title: "Favourite Classes",
    description: "Classes you saved",
    href: "/dashboard/favourites/classes",
    iconBg: "bg-sky-500/15 text-sky-400 group-hover:bg-sky-500 group-hover:text-white",
    icon: (
      <svg {...iconProps} className={iconClass} fill="currentColor" stroke="none">
        <path d="M8 5.14v14l11-7-11-7z" />
      </svg>
    ),
  },
  {
    title: "Favourite Exams",
    description: "Exams you saved",
    href: "/dashboard/favourites/exams",
    iconBg: "bg-violet-500/15 text-violet-400 group-hover:bg-violet-500 group-hover:text-white",
    icon: (
      <svg {...iconProps}>
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
        <path d="M9 5a2 2 0 002-2h2a2 2 0 002 2" />
        <path d="M9 5a2 2 0 002 2h2a2 2 0 002-2" />
        <path d="m9 14 2 2 4-4" />
      </svg>
    ),
  },
  {
    title: "Favourite Materials",
    description: "Materials you saved",
    href: "/dashboard/favourites/materials",
    iconBg: "bg-emerald-500/15 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white",
    icon: (
      <svg {...iconProps}>
        <path d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    ),
  },
  {
    title: "Favourite Q&A",
    description: "Questions you saved",
    href: "/dashboard/favourites/qa",
    iconBg: "bg-amber-500/15 text-amber-400 group-hover:bg-amber-500 group-hover:text-white",
    icon: (
      <svg {...iconProps}>
        <path d="M8 10h8M8 14h6" />
        <path d="M21 11a9 9 0 11-18 0 9 9 0 0118 0z" />
        <path d="M12 16h.01" />
      </svg>
    ),
  },
];

export default function FavouritesOverview() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Link
          key={card.href}
          href={card.href}
          className="group flex flex-col items-center rounded-2xl border border-ink/10 bg-dark-900 p-6 text-center shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-primary-600/60 hover:shadow-primary-900/30 active:scale-[0.98]"
        >
          <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl shadow-md transition ${card.iconBg}`}>
            {card.icon}
          </span>
          <h3 className="mt-4 text-sm font-bold leading-snug text-heading transition group-hover:text-primary-400 sm:text-[15px]">
            {card.title}
          </h3>
          <p className="mt-1.5 text-xs leading-relaxed text-neutral-400 sm:text-[13px]">
            {card.description}
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-neutral-500 transition group-hover:text-primary-400">
            Open
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-3.5 w-3.5 transition group-hover:translate-x-0.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
            </svg>
          </span>
        </Link>
      ))}
    </div>
  );
}
