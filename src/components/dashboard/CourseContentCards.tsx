"use client";

import Link from "next/link";
import { BackLink, LevelStates, useCourseLearning } from "@/components/dashboard/CourseLevels";
import type { ChapterItem } from "@/lib/my-learning";

export type ContentKind = "classes" | "exams" | "materials" | "archive";

/** All chapters of the course, in curriculum order (subject → chapter). */
export function flatChapters(course: {
  subjects: { chapters: ChapterItem[] }[];
}): ChapterItem[] {
  return course.subjects.flatMap((subject) => subject.chapters);
}

export function contentBase(slug: string) {
  return `/dashboard/enrolled-courses/${encodeURIComponent(slug)}/content`;
}

export function chapterHref(
  slug: string,
  chapterId: string,
  kind: ContentKind,
): string {
  return `${contentBase(slug)}/chapters/${encodeURIComponent(chapterId)}/${kind}`;
}

/* ── Course Content page: exactly 4 cards — Class / Exam / Materials / Archive (order MUST be Class, Exam, Materials, Archive) ────── */

type CardDef = {
  key: ContentKind;
  title: string;
  accent: string;
  icon: React.ReactNode;
  countLabel: (n: number) => string;
};

const TYPE_KEY_MAP: Record<ContentKind, string> = {
  classes: "class",
  exams: "exam",
  materials: "materials",
  archive: "archive",
};

const CARDS: CardDef[] = [
  {
    key: "classes",
    title: "Class",
    accent:
      "bg-primary-600/15 text-primary-400 group-hover/card:bg-primary-600 group-hover/card:text-white",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    ),
    countLabel: (n) => `${n} class${n === 1 ? "" : "es"}`,
  },
  {
    key: "exams",
    title: "Exam",
    accent:
      "bg-violet-500/15 text-violet-400 group-hover/card:bg-violet-500 group-hover/card:text-white",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    countLabel: (n) => `${n} exam${n === 1 ? "" : "s"}`,
  },
  {
    key: "materials",
    title: "Materials",
    accent:
      "bg-emerald-500/15 text-emerald-400 group-hover/card:bg-emerald-500 group-hover/card:text-white",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      </svg>
    ),
    countLabel: (n) => `${n} material${n === 1 ? "" : "s"}`,
  },
  {
    key: "archive",
    title: "Archive",
    accent:
      "bg-amber-500/15 text-amber-400 group-hover/card:bg-amber-500 group-hover/card:text-white",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7M9 11h6" />
      </svg>
    ),
    countLabel: (n) => `${n} item${n === 1 ? "" : "s"}`,
  },
];

export default function DirectContentView({
  slug,
  subjectId,
}: {
  slug: string;
  /** When set, only this subject's chapters are shown and the header shows
   *  the subject name (per-subject content page for multi-subject courses). */
  subjectId?: string;
}) {
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

  const subject = subjectId
    ? course.subjects.find((item) => item.id === subjectId) ?? null
    : null;
  if (subjectId && !subject) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-8 text-center">
          <p className="font-bold text-yellow-300">Subject not found</p>
          <BackLink
            href={`/dashboard/enrolled-courses/${encodeURIComponent(slug)}`}
            label={`Back to ${course.name}`}
          />
        </div>
      </section>
    );
  }

  const chapters = subject ? subject.chapters : flatChapters(course);
  const title = subject ? subject.name : course.name;
  const backHref = subject
    ? `/dashboard/enrolled-courses/${encodeURIComponent(slug)}`
    : "/dashboard/enrolled-courses";
  const backLabel = subject ? course.name : "My Enrolled Courses";

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <BackLink href={backHref} label={backLabel} />

      {/* Course header */}
      <header className="mt-5 grid gap-6 md:grid-cols-[minmax(0,320px)_1fr]">
        <div className="aspect-video w-full overflow-hidden rounded-2xl border border-ink/10 bg-dark-800">
          {course.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={course.imageUrl} alt={course.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-4xl font-black text-ink/20">
              MS
            </div>
          )}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-primary-500/40 bg-dark-950/80 px-2.5 py-1 text-xs font-bold text-primary-400">
              {course.courseKind === "paid" ? "Paid Course" : "Free Course"}
            </span>
            <span className="rounded-full border border-ink/10 bg-ink/5 px-2.5 py-1 text-xs font-bold text-neutral-300">
              {course.category}
            </span>
            {subject ? (
              <span className="rounded-full border border-primary-500/40 bg-dark-950/80 px-2.5 py-1 text-xs font-bold text-primary-300">
                {subject.name}
              </span>
            ) : null}
          </div>
          <h1 className="mt-3 text-2xl font-extrabold text-heading sm:text-3xl">
            {title}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-neutral-400">
            Select a card below, then choose a chapter to open its content.
          </p>
        </div>
      </header>

      {chapters.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-ink/15 bg-dark-900/60 p-10 text-center">
          <p className="font-semibold text-heading">No course content available yet.</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-neutral-400">
            No chapters have been published for this course yet. The admin has
            not configured any content for this course.
          </p>
        </div>
      ) : (
        <div className="mt-10 grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
          {CARDS.map((card) => {
            // Structural nodes must NOT disappear: show chapter if it belongs to
            // this content type (via contentType) OR has content for this kind
            // (legacy mixed chapters). Archive only via contentType.
            const typeKey = TYPE_KEY_MAP[card.key];
            const filtered = chapters.filter((chapter) => {
              const ct = (chapter.contentType ?? "class").toLowerCase();
              if (ct === typeKey) return true;
              if (card.key === "archive") return false;
              if (card.key === "classes" && chapter.classes.length > 0) return true;
              if (card.key === "exams" && chapter.exams.length > 0) return true;
              if (card.key === "materials" && chapter.materials.length > 0) return true;
              // Fallback for legacy 'class' chapters that hold mixed content
              // but were not split per type — show under any card where they have items.
              return false;
            });
            // For direct content, still show all chapters per type if filtered empty?
            // Spec 11: chapter structural node must never disappear even when empty.
            // So for Class/Exam/Materials/Archive we show at least the type-matched
            // chapters even with 0 items. If a type has zero chapters at all, show
            // empty message inside card instead of hiding the card.
            const displayChapters = filtered.length > 0 ? filtered : chapters.filter((c) => (c.contentType ?? "class").toLowerCase() === typeKey);
            const showEmptyCard = displayChapters.length === 0 && filtered.length === 0;
            return (
            <article
              key={card.key}
              className="group/card flex flex-col rounded-2xl border border-ink/10 bg-dark-900 p-5 shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-primary-600/60 hover:shadow-primary-900/30"
            >
              <header className="flex items-center gap-3">
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition ${card.accent}`}
                >
                  {card.icon}
                </span>
                <h2 className="text-lg font-extrabold text-heading">
                  {card.title}
                </h2>
              </header>

              {showEmptyCard ? (
                <p className="mt-4 rounded-xl border border-dashed border-ink/15 bg-dark-950/60 px-3 py-6 text-center text-xs text-neutral-500">
                  No {card.title.toLowerCase()} chapters yet.
                </p>
              ) : (
              <ul className="mt-4 flex flex-col gap-2">
                {(displayChapters.length > 0 ? displayChapters : filtered).map((chapter) => {
                  const count =
                    card.key === "classes"
                      ? chapter.classes.length
                      : card.key === "exams"
                        ? chapter.exams.length
                        : card.key === "materials"
                          ? chapter.materials.length
                          : 0;
                  return (
                    <li key={`${card.key}-${chapter.id}`}>
                      <Link
                        href={chapterHref(slug, chapter.id, card.key)}
                        className="group/ch flex items-center gap-3 rounded-xl border border-ink/10 bg-ink/5 px-3.5 py-2.5 transition hover:border-primary-600/50 hover:bg-primary-600/10"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-heading transition group-hover/ch:text-primary-400">
                            {chapter.name}
                          </span>
                          <span className="text-[11px] text-neutral-500">
                            {card.key === "archive" ? chapter.name : card.countLabel(count)}
                          </span>
                        </span>
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          className="h-4 w-4 shrink-0 text-neutral-500 transition group-hover/ch:translate-x-1 group-hover/ch:text-primary-400"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
                        </svg>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              )}
            </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
