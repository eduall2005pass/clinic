"use client";

import { useState } from "react";
import ExamCard from "@/components/ExamCard";
import type { PublicExam, CourseType } from "@/lib/public-exams";

export default function PublicExamList({
  exams,
  batches,
}: {
  exams: PublicExam[];
  batches: string[];
}) {
  const [batch, setBatch] = useState("All Batches");
  const [courseType, setCourseType] = useState<"All" | CourseType>("All");

  const filtered = exams.filter(
    (exam) =>
      exam.published &&
      (batch === "All Batches" || exam.batch === batch) &&
      (courseType === "All" || exam.courseType === courseType)
  );

  const selectClass =
    "rounded-lg border border-ink/10 bg-dark-850 px-3.5 py-2.5 text-sm font-semibold text-heading transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30";

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <select
            aria-label="Filter by batch"
            value={batch}
            onChange={(event) => setBatch(event.target.value)}
            className={selectClass}
          >
            <option value="All Batches">All Batches</option>
            {batches.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by course type"
            value={courseType}
            onChange={(event) =>
              setCourseType(event.target.value as "All" | CourseType)
            }
            className={selectClass}
          >
            <option value="All">All Course Types</option>
            <option value="Academic">Academic</option>
            <option value="Admission">Admission</option>
          </select>
        </div>

        <p className="text-sm font-medium text-neutral-400">
          {filtered.length} exam{filtered.length === 1 ? "" : "s"} found
        </p>
      </div>

      {filtered.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((exam) => (
            <ExamCard key={exam.id} exam={exam} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-ink/15 bg-dark-900/60 p-10 text-center">
          <p className="font-semibold text-heading">No exams found</p>
          <p className="mt-1 text-sm text-neutral-400">
            Try changing the batch or course type filters.
          </p>
        </div>
      )}
    </section>
  );
}