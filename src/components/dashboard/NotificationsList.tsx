"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";

type Notification = {
  id: string;
  title: string;
  message: string;
  audience: "all" | "students" | "admins";
  createdAt: string;
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function NotificationsList() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await user.getIdToken();
        const response = await fetch("/api/notifications", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Failed to load notifications.");
        const data = (await response.json()) as { notifications?: Notification[] };
        if (!cancelled) setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
      } catch {
        if (!cancelled) {
          setNotifications([]);
          setError(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-extrabold text-heading">Notifications</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Updates and announcements from MediSpark.
      </p>

      {notifications === null ? (
        <div className="mt-8 space-y-3" aria-label="Loading notifications">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="h-24 animate-pulse rounded-2xl border border-ink/10 bg-dark-900/60"
            />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-ink/15 bg-dark-900/60 p-12 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600/15 text-primary-500">
            <svg
              className="h-7 w-7"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              viewBox="0 0 24 24"
            >
              <path d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
            </svg>
          </span>
          <p className="mt-5 font-semibold text-heading">No notifications yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-neutral-400">
            {error
              ? "We could not load your notifications right now. Please try again later."
              : "Announcements from MediSpark will appear here."}
          </p>
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {notifications.map((notification) => (
            <li
              key={notification.id}
              className="rounded-2xl border border-ink/10 bg-dark-900 p-6 shadow-lg shadow-black/20 transition duration-300 hover:border-primary-600/60 hover:shadow-primary-900/30 sm:p-7"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-primary-500/40 bg-primary-600/15 px-2.5 py-1 text-xs font-bold text-primary-400">
                  Notice
                </span>
                <time className="text-xs font-semibold text-neutral-500" dateTime={notification.createdAt}>
                  {formatDate(notification.createdAt)}
                </time>
              </div>
              <h2 className="mt-3 text-lg font-bold text-heading">
                {notification.title}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-neutral-400">
                {notification.message}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
