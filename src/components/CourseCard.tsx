import Link from "next/link";
import Image from "next/image";
import type { Course } from "@/lib/courses";
import { getBatch, formatFee } from "@/lib/courses";

export default function CourseCard({ course }: { course: Course }) {
  const batch = getBatch(course.batchId);

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-primary-500 hover:shadow-lg">
      <div className="relative aspect-[16/10] overflow-hidden">
        <Image
          src={course.image}
          alt={course.name}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition duration-300 group-hover:scale-105"
        />
        <span className="absolute left-4 top-4 rounded-md bg-dark-950/80 px-2.5 py-1 text-xs font-bold text-primary-400 backdrop-blur">
          {course.type}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <h3 className="text-lg font-bold text-dark-900 transition group-hover:text-primary-700">
          {course.name}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-neutral-500">
          {course.description}
        </p>

        <div className="mt-3 flex items-center gap-2 text-xs font-medium text-neutral-500">
          {batch && (
            <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1">
              {batch.label}
            </span>
          )}
          <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1">
            {course.duration}
          </span>
        </div>

        <div className="mt-auto pt-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Course Fee
          </p>
          <p className="mt-1 text-2xl font-extrabold text-primary-700">
            {formatFee(course.fee)}
          </p>

          <div className="mt-4 flex gap-3">
            <Link
              href={`/courses/${course.slug}`}
              className="flex-1 rounded-xl border-2 border-primary-600 px-4 py-2.5 text-center text-sm font-semibold text-primary-600 transition hover:bg-primary-600 hover:text-white"
            >
              View Details
            </Link>
            <button
              type="button"
              className="flex-1 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700"
            >
              Enroll
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}