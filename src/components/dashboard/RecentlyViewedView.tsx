"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import type { RecentViewItem } from "@/lib/my-learning";

type LoadState = "loading" | "error" | "ready";

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(then).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

const typeMeta: Record<
  RecentViewItem["itemType"],
  { label: string; iconClass: string; iconPath: string }
> = {
  course: {
    label: "Courses",
    iconClass: "bg-primary-600/15 text-primary-500",
    iconPath:
      "M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25",
  },
  class: {
    label: "Classes / Lectures",
    iconClass: "bg-sky-500/15 text-sky-400",
    iconPath: "M8 5v14l11-7z",
  },
  exam: {
    label: "Exams",
    iconClass: "bg-violet-500/15 text-violet-400",
    iconPath:
      "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
  },
  material: {
    label: "Materials",
    iconClass: "bg-emerald-500/15 text-emerald-400",
    iconPath:
      "M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z",
  },
};

type SectionKey = RecentViewItem["itemType"];

export default function RecentlyViewedView() {
  const { user, authLoading } = useAuth();
  const [items, setItems] = useState<RecentViewItem[] | null>(null);
  const [state, setState] = useState<LoadState>("loading");

  const load = useCallback(async () => {
    if (!user) return;
    setState("loading");
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/my/recent", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!response.ok) throw new Error("failed");
      const data = (await response.json()) as { items?: RecentViewItem[] };
      setItems(Array.isArray(data.items) ? data.items : []);
      setState("ready");
    } catch {
      setState("error");
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user) void load();
  }, [authLoading, user, load]);

  if (state === "loading") {
    return (
      <section className="mx-auto flex max-w-6xl flex-col items-center px-4 py-24 sm:px-6">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        <p className="mt-4 text-sm font-semibold text-neutral-400">
          Loading your recent activity...
        </p>
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
            onClick={() => void load()}
            className="mt-6 rounded-xl bg-primary-600 px-6 py-3 font-semibold text-white shadow-lg shadow-primary-900/40 transition hover:bg-primary-700 active:scale-[0.98]"
          >
            Try Again
          </button>
        </div>
      </section>
    );
  }

  const all = items ?? [];
  // Newest first within each section too.
  const sections = (Object.keys(typeMeta) as SectionKey[])
    .map((key) => ({
      key,
      label: typeMeta[key].label,
      items: all.filter((item) => item.itemType === key),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <BackLink />

      <header className="mt-5">
        <p className="text-xs font-bold uppercase tracking-widest text-primary-500">
          Dashboard
        </p>
        <h1 className="mt-2 text-2xl font-extrabold text-heading sm:text-3xl">
          Recently Viewed
        </h1>
        <p className="mt-1 text-sm text-neutral-400">
          Pick up where you left off — newest first.
        </p>
      </header>

      {all.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-ink/15 bg-dark-900/60 p-12 text-center">
          <p className="font-semibold text-heading">Nothing viewed yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-neutral-400">
            Open a course or class and it will appear here for quick access.
          </p>
          <Link
            href="/dashboard/enrolled-courses"
            className="mt-6 inline-block rounded-xl bg-primary-600 px-6 py-3 font-semibold text-white shadow-lg shadow-primary-900/40 transition hover:bg-primary-700 active:scale-[0.98]"
          >
            My Enrolled Courses
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-10">
          {sections.map((section) => (
            <div key={section.key}>
              <h2 className="text-base font-extrabold text-heading">
                {section.label}
                <span className="ml-2 rounded-full bg-dark-850 px-2 py-0.5 text-xs font-semibold text-neutral-400">
                  {section.items.length}
                </span>
              </h2>

              <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
                {section.items.map((item) => {
                  const meta = typeMeta[item.itemType];
                  const inner = (
                    <>
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.iconClass}`}
                      >
                        <svg viewBox="0 0 24 24" fill={item.itemType === "class" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" strokeLinecap="round" strokeLinejoin="round">
                          <path d={meta.iconPath} />
                        </svg>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-heading group-hover:text-primary-400">
                          {item.title}
                        </span>
                        <span className="block truncate text-[11px] text-neutral-500">
                          {item.subtitle}
                          {item.viewedAt ? ` · ${timeAgo(item.viewedAt)}` : ""}
                        </span>
                      </span>
                      {!item.external && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-4 w-4 shrink-0 text-neutral-500 transition group-hover:translate-x-1 group-hover:text-primary-400">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
                        </svg>
                      )}
                      {item.external && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-4 w-4 shrink-0 text-neutral-500 transition group-hover:text-primary-400">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14 5h7m0 0v7m0-7L10 16M5 5h4m-4 14h9a2 2 0 002-2v-4" />
                        </svg>
                      )}
                    </>
                  );

                  return (
                    <li key={`${item.itemType}:${item.itemId}`}>
                      {item.external ? (
                        <a
                          href={item.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => void record(item)}
                          className="group flex items-center gap-3.5 rounded-2xl border border-ink/10 bg-dark-900 p-3.5 shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-0.5 hover:border-primary-600/60 hover:shadow-primary-900/30 active:scale-[0.99]"
                        >
                          {inner}
                        </a>
                      ) : (
                        <Link
                          href={item.href}
                          onClick={() => void record(item)}
                          className="group flex items-center gap-3.5 rounded-2xl border border-ink/10 bg-dark-900 p-3.5 shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-0.5 hover:border-primary-600/60 hover:shadow-primary-900/30 active:scale-[0.99]"
                        >
                          {inner}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );

  async function record(item: RecentViewItem) {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      await fetch("/api/my/recent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ itemType: item.itemType, itemId: item.itemId }),
      });
    } catch {
      // Best-effort — history recording must never block navigation.
    }
  }
}

function BackLink() {
  return (
    <Link
      href="/dashboard"
      className="inline-flex items-center gap-1 text-sm font-semibold text-neutral-400 transition hover:text-primary-400"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      Back to Dashboard
    </Link>
  );
}
