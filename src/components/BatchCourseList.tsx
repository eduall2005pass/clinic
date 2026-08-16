"use client";

import { useState } from "react";
import type { Batch, Course } from "@/lib/courses";
import CourseCard from "@/components/CourseCard";

type BatchCourseListProps = {
  batches: Batch[];
  courses: Course[];
};

export default function BatchCourseList({
  batches,
  courses,
}: BatchCourseListProps) {
  const [selectedBatch, setSelectedBatch] = useState<string>(
    batches[0]?.id ?? "all",
  );

  const visible =
    selectedBatch === "all"
      ? courses
      : courses.filter((course) => course.batchId === selectedBatch);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        {batches.map((batch) => {
          const active = selectedBatch === batch.id;
          return (
            <button
              key={batch.id}
              type="button"
              onClick={() => setSelectedBatch(batch.id)}
              aria-pressed={active}
              className={
                active
                  ? "rounded-full bg-primary-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-primary-900/40 transition hover:bg-primary-700"
                  : "rounded-full border border-ink/15 bg-ink/5 px-5 py-2.5 text-sm font-semibold text-neutral-400 transition hover:border-primary-500/60 hover:text-heading"
              }
            >
              {batch.label}
            </button>
          );
        })}
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