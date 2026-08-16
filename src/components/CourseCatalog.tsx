"use client";

import { useMemo, useState } from "react";
import type { Batch, Course, CourseType } from "@/lib/courses";
import CourseCard from "@/components/CourseCard";
import CourseFilters from "@/components/CourseFilters";

type CourseCatalogProps = {
  batches: Batch[];
  courses: Course[];
};

export default function CourseCatalog({
  batches,
  courses,
}: CourseCatalogProps) {
  const [batch, setBatch] = useState<string>("all");
  const [type, setType] = useState<CourseType | "all">("all");

  const groups = useMemo(
    () =>
      batches
        .map((item) => ({
          batch: item,
          items: courses.filter(
            (course) =>
              course.batchId === item.id &&
              (batch === "all" || course.batchId === batch) &&
              (type === "all" || course.type === type)
          ),
        }))
        .filter((group) => group.items.length > 0),
    [batches, courses, batch, type]
  );

  const total = groups.reduce((sum, group) => sum + group.items.length, 0);

  return (
    <div>
      <div className="mb-10 flex flex-col gap-6 rounded-2xl border border-ink/10 bg-dark-900 p-6 shadow-lg shadow-black/20">
        <CourseFilters
          batches={batches}
          batch={batch}
          type={type}
          onBatchChange={setBatch}
          onTypeChange={setType}
        />
        <p className="text-sm font-medium text-neutral-400">
          {total} course{total === 1 ? "" : "s"} found
        </p>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink/15 bg-dark-900/60 p-12 text-center">
          <p className="font-semibold text-heading">No courses found</p>
          <p className="mt-1 text-sm text-neutral-400">
            Try a different batch or course type.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-12">
          {groups.map((group) => (
            <section key={group.batch.id}>
              <div className="mb-6 flex items-center gap-4">
                <h2 className="text-xl font-extrabold text-heading sm:text-2xl">
                  {group.batch.label}
                </h2>
                <span className="rounded-full bg-primary-600/15 px-3 py-1 text-xs font-bold text-primary-500">
                  {group.items.length} course
                  {group.items.length === 1 ? "" : "s"}
                </span>
                <span className="h-px flex-1 bg-ink/10" />
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map((course) => (
                  <CourseCard key={course.slug} course={course} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}