import Link from "next/link";
import Image from "next/image";
import type { Course } from "@/lib/courses";
import { getBatch, formatFee } from "@/lib/courses";

export default function CourseCard({ course }: { course: Course }) {
  const batch = getBatch(course.batchId);

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-dark-900 shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-primary-600/60 hover:shadow-primary-900/30">
      <div className="relative aspect-[16/10] overflow-hidden">
        <Image
          src={course.image}
          alt={course.name}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-dark-950/60 via-transparent to-transparent" />
        <span className="absolute left-4 top-4 rounded-md border border-primary-500/40 bg-dark-950/80 px-2.5 py-1 text-xs font-bold text-primary-400 backdrop-blur">
          {course.type}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <h3 className="text-lg font-bold text-white transition group-hover:text-primary-400">
          {course.name}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-neutral-400">
          {course.description}
        </p>

        <div className="mt-3 flex items-center gap-2 text-xs font-medium text-neutral-400">
          {batch && (
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
              {batch.label}
            </span>
          )}
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
            {course.duration}
          </span>
        </div>

        <div className="mt-auto pt-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Course Fee
          </p>
          <p className="mt-1 text-2xl font-extrabold text-primary-500">
            {formatFee(course.fee)}
          </p>

          <div className="mt-4 flex gap-3">
            <Link
              href={`/courses/${course.slug}`}
              className="flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:border-primary-500/60 hover:bg-white/10"
            >
              View Details
            </Link>
            <button
              type="button"
              className="flex-1 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary-900/40 transition hover:bg-primary-700 active:scale-[0.98]"
            >
              Enroll
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}