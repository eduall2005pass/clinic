import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { courses, getBatch, getCourse, formatFee } from "@/lib/courses";
import PageHeader from "@/components/PageHeader";

type CourseDetailsParams = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return courses.map((course) => ({ slug: course.slug }));
}

export async function generateMetadata({
  params,
}: CourseDetailsParams): Promise<Metadata> {
  const { slug } = await params;
  const course = getCourse(slug);
  return {
    title: course ? course.name : "Course",
    description: course?.description,
  };
}

export default async function CourseDetailsPage({
  params,
}: CourseDetailsParams) {
  const { slug } = await params;
  const course = getCourse(slug);

  if (!course) {
    notFound();
  }

  const batch = getBatch(course.batchId);

  return (
    <main className="flex-1 bg-neutral-50">
      <PageHeader
        title={course.name}
        description="Course overview and enrollment. Lesson content, subjects and materials will be added step by step."
      />

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-neutral-200 shadow-sm">
              <Image
                src={course.image}
                alt={course.name}
                fill
                priority
                sizes="(min-width: 1024px) 55vw, 100vw"
                className="object-cover"
              />
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="flex h-full flex-col rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                {batch && (
                  <span className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-bold text-neutral-600">
                    {batch.label}
                  </span>
                )}
                <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-bold text-primary-700">
                  {course.type}
                </span>
                <span className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-bold text-neutral-600">
                  {course.duration}
                </span>
              </div>

              <h2 className="mt-6 text-2xl font-extrabold text-dark-900">
                {course.name}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-neutral-500">
                {course.description}
              </p>

              <div className="mt-auto pt-8">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  Course Fee
                </p>
                <p className="mt-1 text-3xl font-extrabold text-primary-700">
                  {formatFee(course.fee)}
                </p>

                <div className="mt-6 flex flex-col gap-3">
                  <button
                    type="button"
                    className="w-full rounded-xl bg-primary-600 px-6 py-3.5 font-semibold text-white transition hover:bg-primary-700"
                  >
                    Enroll in this Course
                  </button>
                  <Link
                    href="/courses"
                    className="w-full rounded-xl border-2 border-neutral-200 px-6 py-3 text-center font-semibold text-neutral-600 transition hover:border-primary-500 hover:text-primary-600"
                  >
                    Back to Courses
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}