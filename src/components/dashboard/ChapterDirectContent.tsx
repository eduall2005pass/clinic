"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  BackLink,
  LevelStates,
  recordRecentView,
  useCourseLearning,
} from "@/components/dashboard/CourseLevels";
import type { ContentKind } from "@/components/dashboard/CourseContentCards";
import { contentBase, flatChapters } from "@/components/dashboard/CourseContentCards";
import MaterialCard from "@/components/dashboard/MaterialCard";

const KIND_META: Record<ContentKind, { title: string; emptyLabel: string }> = {
  classes: { title: "Classes", emptyLabel: "classes" },
  exams: { title: "Exams", emptyLabel: "exams" },
  materials: { title: "Materials", emptyLabel: "materials" },
  archive: { title: "Archive", emptyLabel: "archived items" },
};

function EmptyNotice({ what }: { what: string }) {
  return (
    <div className="mt-8 rounded-2xl border border-dashed border-ink/15 bg-dark-900/60 p-10 text-center">
      <p className="font-semibold text-heading">Nothing here yet</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-neutral-400">
        No {what} have been published in this chapter. Please check back later.
      </p>
    </div>
  );
}

export default function ChapterDirectContentView({
  slug,
  chapterId,
  kind,
}: {
  slug: string;
  chapterId: string;
  kind: ContentKind;
}) {
  const { user } = useAuth();
  const { course, state, load, forbiddenKind } = useCourseLearning(slug);

  if (state !== "ready" || !course) {
    return (
      <LevelStates
        state={state}
        load={load}
        slug={slug}
        forbiddenKind={forbiddenKind}
      />
    );
  }

  const chapter =
    flatChapters(course).find((item) => item.id === chapterId) ?? null;
  const meta = KIND_META[kind];

  if (!chapter) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-8 text-center">
          <p className="font-bold text-yellow-300">Chapter not found</p>
          <BackLink href={contentBase(slug)} label={`Back to ${course.name}`} />
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <BackLink href={contentBase(slug)} label={course.name} />

      <header className="mt-5">
        <p className="text-xs font-bold uppercase tracking-widest text-primary-500">
          {meta.title}
        </p>
        <h1 className="mt-2 text-2xl font-extrabold text-heading sm:text-3xl">
          {chapter.name}
        </h1>
        <p className="mt-1 text-sm text-neutral-400">
          All {meta.emptyLabel} in this chapter, in order.
        </p>
      </header>

      {/* ── Classes ─────────────────────────────────────────────────────── */}
      {kind === "classes" &&
        (chapter.classes.length === 0 ? (
          <EmptyNotice what="classes" />
        ) : (
          <ol className="mt-6 space-y-2">
            {chapter.classes.map((cls, index) => (
              <li key={cls.id}>
                <Link
                  href={`/dashboard/enrolled-courses/${encodeURIComponent(slug)}/classes/${encodeURIComponent(cls.id)}`}
                  onClick={() => recordRecentView(user, "class", cls.id)}
                  className="group flex items-center gap-3 rounded-xl border border-ink/10 bg-dark-900 px-3.5 py-3 transition hover:border-primary-600/50 hover:bg-ink/5"
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${
                      cls.completed
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-primary-600/15 text-primary-500"
                    }`}
                  >
                    {cls.completed ? "✓" : index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-heading group-hover:text-primary-400">
                      {cls.title}
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      {cls.durationMinutes > 0 ? `${cls.durationMinutes} min` : "Class"}
                      {cls.lastSeenSeconds > 30 && !cls.completed ? " · resume" : ""}
                    </span>
                  </span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-4 w-4 shrink-0 text-neutral-500 transition group-hover:translate-x-1 group-hover:text-primary-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
                  </svg>
                </Link>
              </li>
            ))}
          </ol>
        ))}

      {/* ── Exams ───────────────────────────────────────────────────────── */}
      {kind === "exams" &&
        (chapter.exams.length === 0 ? (
          <EmptyNotice what="exams" />
        ) : (
          <ol className="mt-6 space-y-2">
            {chapter.exams.map((exam, index) => (
              <li key={exam.id}>
                <Link
                  href={`/exam/${encodeURIComponent(exam.id)}/rules`}
                  onClick={() => recordRecentView(user, "exam", exam.id)}
                  className="group flex items-center gap-3 rounded-xl border border-ink/10 bg-dark-900 px-3.5 py-3 transition hover:border-primary-600/50 hover:bg-ink/5"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-sm font-extrabold text-violet-400">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-heading group-hover:text-primary-400">
                      {exam.title}
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      Exam · {exam.durationMinutes} min · {exam.totalMarks} marks
                    </span>
                  </span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-4 w-4 shrink-0 text-neutral-500 transition group-hover:translate-x-1 group-hover:text-primary-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
                  </svg>
                </Link>
              </li>
            ))}
          </ol>
        ))}

      {/* ── Materials — clean minimal cards: Name + Question Count badge + View PDF ─ */}
      {kind === "materials" &&
        (chapter.materials.length === 0 ? (
          <EmptyNotice what="materials" />
        ) : (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {chapter.materials.map((material) => (
              <MaterialCard
                key={material.id}
                slug={slug}
                material={material}
                onView={() => recordRecentView(user, "material", String(material.id))}
              />
            ))}
          </div>
        ))}

      {/* ── Archive ─────────────────────────────────────────────────────────── */}
      {kind === "archive" &&
        (chapter.classes.length === 0 && chapter.materials.length === 0 && chapter.exams.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-ink/15 bg-dark-900/60 p-10 text-center">
            <p className="font-semibold text-heading">No archived content yet</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-neutral-400">
              No archived items have been published in this chapter. The
              structure remains available — content will appear here when the
              admin adds it.
            </p>
          </div>
        ) : (
          <ol className="mt-6 space-y-2">
            {chapter.classes.map((cls, index) => (
              <li key={`arch-cls-${cls.id}`}>
                <Link
                  href={`/dashboard/enrolled-courses/${encodeURIComponent(slug)}/classes/${encodeURIComponent(cls.id)}`}
                  onClick={() => recordRecentView(user, "class", cls.id)}
                  className="group flex items-center gap-3 rounded-xl border border-ink/10 bg-dark-900 px-3.5 py-3 transition hover:border-primary-600/50 hover:bg-ink/5"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-sm font-extrabold text-amber-400">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-heading group-hover:text-primary-400">
                      {cls.title}
                    </span>
                    <span className="text-[11px] text-neutral-500">Archived · Class</span>
                  </span>
                </Link>
              </li>
            ))}
            {chapter.materials.map((material) => (
              <li key={`arch-mat-${material.id}`}>
                <Link
                  href={`/dashboard/enrolled-courses/${encodeURIComponent(slug)}/materials/${encodeURIComponent(String(material.id))}`}
                  onClick={() => recordRecentView(user, "material", String(material.id))}
                  className="group flex items-center justify-between gap-3 rounded-xl border border-ink/10 bg-dark-900 px-3.5 py-3 transition hover:border-primary-600/50 hover:bg-ink/5"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-heading group-hover:text-primary-400">
                      {material.title}
                    </span>
                    <span className="inline-flex rounded-full bg-ink/10 px-2 py-0.5 text-[10px] font-bold text-neutral-400">
                      {material.questionCount ?? 0} Questions
                    </span>
                  </span>
                  <span className="shrink-0 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-bold text-white group-hover:bg-primary-700">View PDF</span>
                </Link>
              </li>
            ))}
            {chapter.exams.length > 0 && (
              <li className="pt-2 text-xs text-neutral-500">{chapter.exams.length} exam(s) archived in this chapter.</li>
            )}
          </ol>
        ))}
    </section>
  );
}
