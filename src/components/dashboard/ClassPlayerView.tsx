"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import type { CourseLearningData } from "@/lib/my-learning";

type LoadState = "loading" | "error" | "forbidden" | "ready" | "missing";

const playbackRates = [0.5, 0.75, 1, 1.25, 1.5, 2];

function youtubeEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    let videoId = "";
    if (host === "youtu.be") {
      videoId = parsed.pathname.slice(1);
    } else if (host.endsWith("youtube.com")) {
      if (parsed.pathname.startsWith("/embed/") || parsed.pathname.startsWith("/shorts/")) {
        videoId = parsed.pathname.split("/")[2] ?? "";
      } else {
        videoId = parsed.searchParams.get("v") ?? "";
      }
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  } catch {
    return null;
  }
}

function FavouriteButton({
  itemType,
  itemId,
  initial,
  onToggle,
}: {
  itemType: "class" | "material";
  itemId: string;
  initial: boolean;
  onToggle?: (next: boolean) => void;
}) {
  const { user } = useAuth();
  const [isFavourite, setIsFavourite] = useState(initial);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    if (!user || busy) return;
    setBusy(true);
    const previous = isFavourite;
    setIsFavourite(!previous);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/my/favourites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ itemType, itemId }),
      });
      if (!response.ok) throw new Error("failed");
      const data = (await response.json()) as { isFavourite?: boolean };
      setIsFavourite(data.isFavourite === true);
      onToggle?.(data.isFavourite === true);
    } catch {
      setIsFavourite(previous);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={busy}
      aria-pressed={isFavourite}
      className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition active:scale-[0.98] ${
        isFavourite
          ? "border-primary-500/60 bg-primary-600/15 text-primary-400"
          : "border-ink/15 bg-ink/5 text-heading hover:border-primary-500/60 hover:bg-ink/10"
      }`}
    >
      <svg viewBox="0 0 24 24" fill={isFavourite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" className="h-4 w-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.5a.56.56 0 011.04 0l2.13 5.11 5.52.44c.5.04.7.66.32.98l-4.2 3.6 1.28 5.38a.56.56 0 01-.84.61L12 16.7l-4.73 2.92a.56.56 0 01-.84-.61l1.28-5.38-4.2-3.6a.56.56 0 01.32-.98l5.52-.44 2.13-5.11z" />
      </svg>
      {isFavourite ? "In Favourites" : "Add to Favourites"}
    </button>
  );
}

export default function ClassPlayerView({
  slug,
  classId,
}: {
  slug: string;
  classId: string;
}) {
  const { user, authLoading } = useAuth();
  const [course, setCourse] = useState<CourseLearningData | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [rate, setRate] = useState(1);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSavedRef = useRef(0);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  }, [rate]);

  const saveProgress = useCallback(
    async (completed: boolean, seconds: number) => {
      if (!user) return;
      try {
        const token = await user.getIdToken();
        await fetch("/api/my/progress", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ classId, completed, lastSeenSeconds: Math.floor(seconds) }),
        });
      } catch {
        // Progress saving is best-effort.
      }
    },
    [user, classId],
  );

  const load = useCallback(async () => {
    if (!user) return;
    setState("loading");
    try {
      const token = await user.getIdToken();
      const response = await fetch(
        `/api/my/courses/${encodeURIComponent(slug)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        },
      );
      if (response.status === 403) {
        setState("forbidden");
        return;
      }
      if (!response.ok) throw new Error("failed");
      const data = (await response.json()) as { course?: CourseLearningData };
      setCourse(data.course ?? null);
      setState("ready");
    } catch {
      setState("error");
    }
  }, [user, slug]);

  useEffect(() => {
    if (authLoading) return;
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void load();
    }
  }, [authLoading, user, load]);

  const found = (() => {
    if (!course) return null;
    for (const subject of course.subjects) {
      for (const chapter of subject.chapters) {
        const cls = chapter.classes.find((item) => item.id === classId);
        if (cls) {
          return { chapterTitle: chapter.name, cls, siblings: chapter.classes };
        }
      }
    }
    return null;
  })();

  // Opening the class records it in the student's Recently Viewed history.
  useEffect(() => {
    if (!user || !found) return;
    let cancelled = false;
    void user
      .getIdToken()
      .then((token) => {
        if (cancelled) return;
        void fetch("/api/my/recent", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ itemType: "class", itemId: classId }),
        }).catch(() => undefined);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [user, found, classId]);

  if (authLoading || !user || state === "loading") {
    return (
      <section className="mx-auto flex max-w-6xl flex-col items-center px-4 py-24 sm:px-6">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        <p className="mt-4 text-sm font-semibold text-neutral-400">Loading class...</p>
      </section>
    );
  }

  if (state === "forbidden") {
    return (
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-8 text-center">
          <p className="font-bold text-yellow-300">Not enrolled</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-yellow-200/70">
            You are not actively enrolled in this course.
          </p>
          <Link
            href="/dashboard/enrolled-courses"
            className="mt-6 inline-block rounded-xl bg-primary-600 px-6 py-3 font-semibold text-white shadow-lg shadow-primary-900/40 transition hover:bg-primary-700"
          >
            My Enrolled Courses
          </Link>
        </div>
      </section>
    );
  }

  if (state === "error") {
    return (
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
          <p className="font-bold text-red-300">Something went wrong</p>
          <button
            type="button"
            onClick={() => setState("loading")}
            className="mt-6 rounded-xl bg-primary-600 px-6 py-3 font-semibold text-white shadow-lg shadow-primary-900/40 transition hover:bg-primary-700"
          >
            Try Again
          </button>
        </div>
      </section>
    );
  }

  if (!found) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-dashed border-ink/15 bg-dark-900/60 p-12 text-center">
          <p className="font-semibold text-heading">Class not found</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-neutral-400">
            This class does not exist in the course or has been removed.
          </p>
          <Link
            href={`/dashboard/enrolled-courses/${encodeURIComponent(slug)}`}
            className="mt-6 inline-block rounded-xl bg-primary-600 px-6 py-3 font-semibold text-white shadow-lg shadow-primary-900/40 transition hover:bg-primary-700"
          >
            Back to Course
          </Link>
        </div>
      </section>
    );
  }

  const { cls, siblings } = found;
  const embed = cls.videoUrl ? youtubeEmbedUrl(cls.videoUrl) : null;

  return (
    <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href={`/dashboard/enrolled-courses/${encodeURIComponent(slug)}`}
        className="inline-flex items-center gap-1 text-sm font-semibold text-neutral-400 transition hover:text-primary-400"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        {course?.name ?? "Course"}
      </Link>

      <div className="mt-4 overflow-hidden rounded-2xl border border-ink/10 bg-dark-900 shadow-lg shadow-black/20">
        {/* Player */}
        <div className="relative aspect-video w-full bg-black">
          {embed ? (
            <iframe
              src={embed}
              title={cls.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              className="absolute inset-0 h-full w-full"
            />
          ) : cls.videoUrl ? (
            <video
              ref={videoRef}
              src={cls.videoUrl}
              controls
              controlsList="nodownload"
              playsInline
              preload="metadata"
              className="absolute inset-0 h-full w-full"
              onPause={(event) => void saveProgress(false, event.currentTarget.currentTime)}
              onTimeUpdate={(event) => {
                const current = event.currentTarget.currentTime;
                if (current - lastSavedRef.current >= 15) {
                  lastSavedRef.current = current;
                  void saveProgress(false, current);
                }
              }}
              onEnded={(event) =>
                void saveProgress(true, event.currentTarget.duration || event.currentTarget.currentTime)
              }
            >
              <track kind="captions" />
            </video>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center">
              <p className="font-semibold text-heading">No video available</p>
              <p className="text-sm text-neutral-400">
                This class has no video published yet — check the materials below.
              </p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="space-y-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl font-extrabold text-heading">{cls.title}</h1>
              <p className="mt-0.5 text-xs text-neutral-500">{found.chapterTitle}</p>
            </div>
            <FavouriteButton itemType="class" itemId={cls.id} initial={cls.isFavourite} />
          </div>

          {/* Playback speed — HTML5 video only */}
          {!embed && cls.videoUrl && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-neutral-500">
                Speed
              </span>
              {playbackRates.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRate(value)}
                  aria-pressed={rate === value}
                  className={`rounded-full border px-3 py-1 text-xs font-bold transition ${
                    rate === value
                      ? "border-primary-500/60 bg-primary-600/20 text-primary-400"
                      : "border-ink/10 bg-ink/5 text-neutral-300 hover:border-primary-500/40 hover:bg-ink/10"
                  }`}
                >
                  {value}x
                </button>
              ))}
            </div>
          )}

          {/* Materials / downloads */}
          {(cls.noteUrl || !embed) && (
            <div className="flex flex-wrap gap-3">
              {cls.noteUrl ? (
                <a
                  href={cls.noteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-ink/15 bg-ink/5 px-4 py-2.5 text-sm font-semibold text-heading transition hover:border-primary-500/60 hover:bg-ink/10"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  </svg>
                  Download Slide/PDF
                </a>
              ) : null}
              {!embed && cls.videoUrl ? (
                <button
                  type="button"
                  onClick={() => void saveProgress(true, videoRef.current?.currentTime ?? 0)}
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-400 transition hover:bg-emerald-500/20"
                >
                  Mark as Completed
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* Other classes in this chapter */}
      {siblings.length > 1 && (
        <div className="mt-8">
          <h2 className="text-base font-bold text-heading">More classes in this chapter</h2>
          <ul className="mt-3 space-y-2">
            {siblings.map((sibling) => (
              <li key={sibling.id}>
                <Link
                  href={`/dashboard/enrolled-courses/${encodeURIComponent(slug)}/classes/${encodeURIComponent(sibling.id)}`}
                  className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                    sibling.id === cls.id
                      ? "border-primary-600/60 bg-primary-600/10 text-primary-400"
                      : "border-ink/10 bg-dark-900 text-heading hover:border-primary-600/50 hover:bg-ink/5"
                  }`}
                >
                  <span className="truncate">{sibling.title}</span>
                  {sibling.completed ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4 shrink-0 text-emerald-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
