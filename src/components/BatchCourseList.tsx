"use client";

import { useState } from "react";
import type { BatchFilterOption, Course } from "@/lib/courses";
import CourseCard from "@/components/CourseCard";

type BatchCourseListProps = {
  /** Exactly 4 options — first one is "All Batch". */
  options: BatchFilterOption[];
  courses: Course[];
};

export default function BatchCourseList({
  options,
  courses,
}: BatchCourseListProps) {
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
                    : "border border-ink/15 bg-ink/5 font-semibold text-neutral-400 hover:border-primary-500/60 hover:text-heading"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-ink/15 bg-dark-900/60 p-12 text-center">
          <p className="font-semibold text-heading">No courses found</p>
          <p className="mt-1 text-sm text-neutral-400">
            Courses for this batch are coming soon.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((course) => (
            <CourseCard key={course.slug} course={course} />
          ))}
        </div>
      )}
    </div>
  );
}
