"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Announcement } from "@/lib/announcements";

const STORAGE_PREFIX = "medispark-announcement-dismissed-";

export default function AnnouncementBar() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/announcements", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { announcements?: Announcement[] } | null) => {
        if (cancelled) return;
        const first = data?.announcements?.[0];
        if (!first) return;
        setAnnouncement(first);
        try {
          setDismissed(
            window.localStorage.getItem(STORAGE_PREFIX + first.id) === "1",
          );
        } catch {
          setDismissed(false);
        }
      })
      .catch(() => {
        // No announcement shown when the API is unreachable.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!announcement || dismissed) return null;

  function dismiss() {
    try {
      window.localStorage.setItem(STORAGE_PREFIX + announcement?.id, "1");
    } catch {}
    setDismissed(true);
  }

  return (
    <div
      role="region"
      aria-label="Announcement"
      className="relative z-[60] bg-primary-600 text-white"
    >
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 sm:px-6">
        <span aria-hidden className="text-base leading-none">📣</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{announcement.title}</p>
          {announcement.description && (
            <p className="hidden truncate text-xs text-white/85 sm:block">
              {announcement.description}
            </p>
          )}
        </div>
        {announcement.buttonText && announcement.buttonHref && (
          <Link
            href={announcement.buttonHref}
            className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-primary-700 transition hover:bg-neutral-100 active:scale-[0.98]"
          >
            {announcement.buttonText}
          </Link>
        )}
        <button
          type="button"
          aria-label="Dismiss announcement"
          onClick={dismiss}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white/80 transition hover:bg-white/15 hover:text-white"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
