"use client";

import type { Batch, CourseType } from "@/lib/courses";
import { courseTypes } from "@/lib/courses";

type CourseFiltersProps = {
  batches: Batch[];
  batch: string;
  type: CourseType | "all";
  onBatchChange: (value: string) => void;
  onTypeChange: (value: CourseType | "all") => void;
};

const selectClass =
  "rounded-xl border border-ink/10 bg-dark-850 px-4 py-2.5 text-sm font-semibold text-heading outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30";

export default function CourseFilters({
  batches,
  batch,
  type,
  onBatchChange,
  onTypeChange,
}: CourseFiltersProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-bold uppercase tracking-widest text-neutral-500">
          Batch
        </span>
        <select
          value={batch}
          onChange={(event) => onBatchChange(event.target.value)}
          className={selectClass}
        >
          <option value="all">All Batches</option>
          {batches.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-bold uppercase tracking-widest text-neutral-500">
          Course Type
        </span>
        <select
          value={type}
          onChange={(event) =>
            onTypeChange(event.target.value as CourseType | "all")
          }
          className={selectClass}
        >
          <option value="all">All Types</option>
          {courseTypes.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}