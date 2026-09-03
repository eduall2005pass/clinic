"use client";

import Link from "next/link";

type Props = {
  slug: string;
  material: { id: number | string; title: string; questionCount: number };
  onView?: () => void;
};

export default function MaterialCard({ slug, material, onView }: Props) {
  const qc = Math.max(0, Number(material.questionCount) || 0);
  return (
    <div className="rounded-2xl border border-ink/10 bg-dark-900 p-4 shadow-lg shadow-black/10 transition hover:border-primary-500/30 hover:shadow-primary-900/10 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="min-w-0 flex-1 text-sm font-extrabold leading-snug text-heading sm:text-[15px]">
          {material.title}
        </h3>
        <span className="inline-flex shrink-0 items-center rounded-full bg-primary-600/15 px-3 py-1 text-xs font-bold text-primary-400 sm:text-[11px]">
          {qc} Questions
        </span>
      </div>
      <Link
        href={`/dashboard/enrolled-courses/${encodeURIComponent(slug)}/materials/${encodeURIComponent(String(material.id))}`}
        onClick={() => onView?.()}
        className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-primary-900/20 transition hover:bg-primary-700 active:scale-[0.98] sm:w-auto"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        </svg>
        View PDF
      </Link>
    </div>
  );
}
