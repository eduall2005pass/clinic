import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  getBatch,
  getPayableFee,
  hasDiscount,
  formatFee,
} from "@/lib/courses";
import { getLiveCourse } from "@/lib/course-catalog";
import { getCourseKind } from "@/lib/enrollments";
import CourseEnrollFlow from "@/components/auth/CourseEnrollFlow";

export const dynamic = "force-dynamic";

type CourseDetailsParams = { params: Promise<{ slug: string }> };

export async function generateMetadata({
  params,
}: CourseDetailsParams): Promise<Metadata> {
  const { slug } = await params;
  const course = await getLiveCourse(slug);
  return {
    title: course ? course.name : "Course",
    description: course?.shortDescription,
  };
}

export default async function CourseDetailsPage({
  params,
}: CourseDetailsParams) {
  const { slug } = await params;
  const course = await getLiveCourse(slug);

  if (!course) {
    notFound();
  }

  const batch = getBatch(course.batchId);
  const kind = getCourseKind(course);
  const payableFee = getPayableFee(course);
  const discounted = hasDiscount(course);

  return (
    <main className="flex-1 bg-dark-950">
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <Link
          href="/courses"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-400 transition hover:text-primary-400"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            viewBox="0 0 24 24"
          >
            <path d="M19 12H5" />
            <path d="m12 19-7-7 7-7" />
          </svg>
          All Courses
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-ink/10 shadow-lg shadow-black/20">
              <Image
                src={course.image}
                alt={course.name}
                fill
                priority
                sizes="(min-width: 1024px) 55vw, 100vw"
                className="object-cover"
              />
            </div>

            <div className="mt-6 flex items-center gap-4 rounded-2xl border border-ink/10 bg-dark-900 p-6 shadow-lg shadow-black/20">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-ink/10 bg-dark-800">
                <Image
                  src={course.teacherPhoto}
                  alt={course.teacherName}
                  width={64}
                  height={64}
                  className="rounded-2xl"
                />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Teacher / Mentor
                </p>
                <p className="mt-0.5 truncate text-lg font-bold text-heading">
                  {course.teacherName}
                </p>
                <p className="truncate text-sm text-primary-400">
                  {course.designation}
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="flex h-full flex-col rounded-2xl border border-ink/10 bg-dark-900 p-8 shadow-lg shadow-black/20">
              <div className="flex flex-wrap items-center gap-2">
                {batch && (
                  <span className="rounded-full border border-ink/10 bg-ink/5 px-3 py-1 text-xs font-bold text-neutral-300">
                    {batch.label}
                  </span>
                )}
                <span className="rounded-full bg-primary-600/15 px-3 py-1 text-xs font-bold text-primary-500">
                  {course.category}
                </span>
                <span className="rounded-full border border-ink/10 bg-ink/5 px-3 py-1 text-xs font-bold text-neutral-300">
                  {course.duration}
                </span>
                <span
                  className={
                    kind === "paid"
                      ? "rounded-full bg-primary-600/15 px-3 py-1 text-xs font-bold text-primary-500"
                      : "rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400"
                  }
                >
                  {kind === "paid" ? "Paid" : "Free"}
                </span>
              </div>

              <h2 className="mt-6 text-2xl font-extrabold text-heading">
                {course.name}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-neutral-400">
                {course.description}
              </p>

              <div className="mt-auto pt-8">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Course Fee
                </p>
                <div className="mt-1 flex items-baseline gap-2">
                  {discounted && (
                    <span className="text-sm font-semibold text-neutral-500 line-through">
                      Actual Fee: {formatFee(course.fee)}
                    </span>
                  )}
                  <p className="text-3xl font-extrabold text-primary-500">
                    {formatFee(payableFee)}
                  </p>
                </div>
                {discounted && (
                  <p className="mt-1 text-xs font-semibold text-emerald-400">
                    Discount Fee — you save{" "}
                    {formatFee(course.fee - payableFee)}
                  </p>
                )}

                <div className="mt-6 flex flex-col gap-3">
                  <Suspense
                    fallback={
                      <div className="h-[52px] w-full animate-pulse rounded-xl bg-ink/10" />
                    }
                  >
                    <CourseEnrollFlow course={course} />
                  </Suspense>
                  <Link
                    href="/courses"
                    className="w-full rounded-xl border border-ink/15 bg-ink/5 px-6 py-3 text-center font-semibold text-heading transition hover:border-primary-500/60 hover:bg-ink/10"
                  >
                    Back to Courses
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {course.features.length > 0 && (
          <div className="mt-12">
            <p className="text-xs font-bold uppercase tracking-widest text-primary-500">
              Course Features
            </p>
            <h2 className="mt-2 text-2xl font-extrabold text-heading">
              What&apos;s included
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {course.features.map((feature) => (
                <div
                  key={feature}
                  className="flex items-start gap-3 rounded-2xl border border-ink/10 bg-dark-900 p-4 shadow-lg shadow-black/20"
                >
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-600/15 text-primary-500">
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      viewBox="0 0 24 24"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </span>
                  <p className="text-sm font-semibold text-heading">
                    {feature}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {course.overview.length > 0 && (
          <div className="mt-12">
            <p className="text-xs font-bold uppercase tracking-widest text-primary-500">
              Course Overview
            </p>
            <h2 className="mt-2 text-2xl font-extrabold text-heading">
              {course.overviewTitle}
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {course.overview.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-2xl border border-ink/10 bg-dark-900 p-4 shadow-lg shadow-black/20"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary-600/15 text-sm font-extrabold text-primary-400">
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                    </svg>
                  </span>
                  <p className="text-sm font-semibold text-heading">{item}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}