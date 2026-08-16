import type { Course } from "@/lib/courses";

export default function CourseCard({ course }: { course: Course }) {
  return (
    <article className="group rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-primary-500 hover:shadow-lg">
      <span className="inline-block rounded-md bg-primary-50 px-2.5 py-1 text-xs font-bold text-primary-700">
        {course.category}
      </span>
      <h3 className="mt-4 text-lg font-bold text-dark-900 transition group-hover:text-primary-700">
        {course.subject}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-neutral-500">
        {course.description}
      </p>
      <div className="mt-4 flex items-center gap-4 text-xs font-medium text-neutral-500">
        <span>{course.level}</span>
        <span className="h-1 w-1 rounded-full bg-neutral-300" />
        <span>{course.duration}</span>
      </div>
    </article>
  );
}