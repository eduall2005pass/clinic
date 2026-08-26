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

export function kindHref(slug: string, kind: ContentKind, subjectId?: string): string {
  if (subjectId) {
    return `/dashboard/enrolled-courses/${encodeURIComponent(slug)}/subjects/${encodeURIComponent(subjectId)}/content/${kind}`;
  }
  return `${contentBase(slug)}/${kind}`;
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

  // Minimal landing: ONLY 4 cards (no banner/name/description)
  const backHref = subjectId
    ? `/dashboard/enrolled-courses/${encodeURIComponent(slug)}/subjects/${encodeURIComponent(subjectId)}`
    : "/dashboard/enrolled-courses";
  const backLabel = subjectId ? "Back" : "My Enrolled Courses";

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <BackLink href={backHref} label={backLabel} />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map((card) => (
          <Link
            key={card.key}
            href={kindHref(slug, card.key, subjectId)}
            className="group/card flex min-h-[110px] flex-col items-center justify-center gap-3 rounded-2xl border border-ink/10 bg-dark-900 p-6 text-center shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-primary-600/60 hover:shadow-primary-900/30"
          >
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition ${card.accent}`}>
              {card.icon}
            </span>
            <span className="text-base font-extrabold text-heading group-hover/card:text-primary-400">
              {card.title}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function CourseKindChaptersView({
  slug,
  kind,
  subjectId,
}: {
  slug: string;
  kind: ContentKind;
  subjectId?: string;
}) {
  const { course, state, load, forbiddenKind } = useCourseLearning(slug);

  if (state !== "ready" || !course) {
    return <LevelStates state={state} load={load} slug={slug} forbiddenKind={forbiddenKind} />;
  }

  const subject = subjectId ? course.subjects.find((item) => item.id === subjectId) ?? null : null;
  if (subjectId && !subject) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-8 text-center">
          <p className="font-bold text-yellow-300">Subject not found</p>
          <BackLink href={`/dashboard/enrolled-courses/${encodeURIComponent(slug)}`} label="Back" />
        </div>
      </section>
    );
  }

  const allChapters = subject ? subject.chapters : flatChapters(course);
  const typeKey = TYPE_KEY_MAP[kind];
  const filtered = allChapters.filter((chapter) => {
    const ct = (chapter.contentType ?? "class").toLowerCase();
    if (ct === typeKey) return true;
    if (kind === "archive") return false;
    if (kind === "classes" && chapter.classes.length > 0) return true;
    if (kind === "exams" && chapter.exams.length > 0) return true;
    if (kind === "materials" && chapter.materials.length > 0) return true;
    return false;
  });
  // Structural: keep type-matched even when empty, but if filtered empty due to legacy mixed, fallback to type-matched
  const displayChapters = filtered.length > 0 ? filtered : allChapters.filter((c) => (c.contentType ?? "class").toLowerCase() === typeKey);
  const chaptersToShow = displayChapters.length > 0 ? displayChapters : filtered;
  const cardTitle = CARDS.find((c) => c.key === kind)?.title ?? kind;

  const backHref = subjectId
    ? `/dashboard/enrolled-courses/${encodeURIComponent(slug)}/subjects/${encodeURIComponent(subjectId)}/content`
    : contentBase(slug);
  const backLabel = subjectId ? "Course Content" : "Course Content";

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <BackLink href={backHref} label={backLabel} />
      <h1 className="mt-4 text-2xl font-extrabold text-heading sm:text-3xl">{cardTitle}</h1>
      <p className="mt-1 text-sm text-neutral-400">Select a chapter to open its {cardTitle.toLowerCase()}.</p>
      {chaptersToShow.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-ink/15 bg-dark-900/60 p-10 text-center">
          <p className="font-semibold text-heading">No course content available yet.</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-neutral-400">No chapters have been published for {cardTitle.toLowerCase()} yet.</p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {chaptersToShow.map((chapter) => (
            <li key={chapter.id}>
              <Link
                href={chapterHref(slug, chapter.id, kind)}
                className="group flex items-center gap-3 rounded-xl border border-ink/10 bg-dark-900 px-4 py-4 transition hover:-translate-y-0.5 hover:border-primary-600/60 hover:shadow-lg"
              >
                <span className="flex-1 truncate text-sm font-bold text-heading group-hover:text-primary-400">{chapter.name}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-4 w-4 shrink-0 text-neutral-500 group-hover:translate-x-1 group-hover:text-primary-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
                </svg>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
