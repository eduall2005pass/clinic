"use client";

import { useState } from "react";
import Link from "next/link";
import type { BatchFilterOption, Course } from "@/lib/courses";
import CourseCard from "@/components/CourseCard";

type AdminBatchCourseListProps = {
  options: BatchFilterOption[];
  courses: Course[];
  /** Course-manager base route — [ Edit ] opens it with ?edit=<slug>. */
  editBase?: string;
};

/**
 * Same-to-same copy of the website's BatchCourseList (batch pills + identical
 * CourseCard grid) used inside the Admin Panel's mirrored Courses page.
 * The only addition: a hover [ Edit ] control on every course card.
 */
export default function AdminBatchCourseList({
  options,
  courses,
  editBase = "/admin/courses/all",
}: AdminBatchCourseListProps) {
  const [selectedBatch, setSelectedBatch] = useState<string>(
    options[0]?.id ?? "all",
  );

  const visible =
    selectedBatch === "all"
      ? courses
      : courses.filter((course) => course.batchId === selectedBatch);

  return (
    <div>
      {/* Mobile: single horizontal row with horizontal scrolling when needed.
          Desktop/tablet: wraps naturally. */}
      <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:overflow-visible sm:px-0">
        <div className="flex flex-nowrap gap-3 sm:flex-wrap">
          {options.map((option) => {
            const active = selectedBatch === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setSelectedBatch(option.id)}
                aria-pressed={active}
                className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-bold transition ${
                  active
                    ? "bg-primary-600 text-white shadow-md shadow-primary-900/40 hover:bg-primary-700"
                    : "border border-ink/15 bg-ink/5 font-semibold text-neutral-400 hover:border-[#93c5fd] hover:text-heading"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-ink/15 bg-white admin-dark:bg-[#112544]/60 p-12 text-center">
          <p className="font-semibold text-heading">No courses found</p>
          <p className="mt-1 text-sm text-neutral-400">
            Courses for this batch are coming soon.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((course) => (
            <div key={course.slug} className="group/card relative">
              <CourseCard course={course} />
              <Link
                href={`${editBase}?edit=${encodeURIComponent(course.slug)}`}
                title={`Edit ${course.name}`}
                className="absolute left-1/2 top-3 z-30 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-lg border border-primary-500/50 bg-[#f1f5f9] admin-dark:bg-[#0a162e]/85 px-2.5 py-1 text-[11px] font-bold text-primary-400 opacity-0 shadow-lg shadow-black/30 backdrop-blur transition hover:border-primary-400 hover:text-primary-300 focus:opacity-100 group-hover/card:opacity-100"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-3 w-3"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.86 4.49a2.1 2.1 0 013 2.97L8.42 18.9l-3.9 1 1-3.9L16.87 4.5z"
                  />
                </svg>
                Edit
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
