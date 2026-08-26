"use client";

import { useCallback, useEffect, useState } from "react";
import {
  useAdminGate,
  noticeClass,
  cardClass,
  inputClass,
  labelClass,
  buttonPrimaryClass,
  type Notice,
} from "@/components/admin/admin-ui";

type SendResult = { sent: number; failed: number; total: number };

export default function PushManager() {
  const gate = useAdminGate();
  const [count, setCount] = useState<number | null>(null);
  const [audience, setAudience] = useState<"broadcast" | "specific">("broadcast");
  const [email, setEmail] = useState("");
  const [targetCount, setTargetCount] = useState<number | null>(null);
  const [targetError, setTargetError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/push", { cache: "no-store", headers: gate.headers });
      const data = (await response.json()) as { count?: number };
      setCount(data.count ?? 0);
    } catch {
      setCount(null);
    }
  }, []);

  useEffect(() => {
    if (gate.ready) void load();
  }, [gate.ready, load]);

  // Preview how many devices a specific student has.
  useEffect(() => {
    if (audience !== "specific") return;
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setTargetCount(null);
      setTargetError(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const response = await fetch(
            `/api/admin/push?email=${encodeURIComponent(trimmed)}`,
            { cache: "no-store" },
          );
          const data = (await response.json()) as { count?: number; error?: string };
          if (cancelled) return;
          if (!response.ok) {
            setTargetCount(null);
            setTargetError(data.error ?? "Lookup failed.");
            return;
          }
          setTargetCount(data.count ?? 0);
          setTargetError(null);
        } catch {
          if (!cancelled) setTargetError("Lookup failed.");
        }
      })();
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [email, audience]);

  const canSend =
    title.trim().length >= 2 &&
    body.trim().length >= 2 &&
    !busy &&
    (audience === "broadcast" ||
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()));

  async function handleSend() {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/push", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...gate.headers },
        body: JSON.stringify({
          title,
          body,
          url: url.trim() || undefined,
          audience,
          email: audience === "specific" ? email.trim().toLowerCase() : undefined,
        }),
      });
      const data = (await response.json().catch(() => null)) as
        | { error?: string; result?: SendResult; audience?: string }
        | null;
      if (!response.ok || !data?.result) {
        setNotice({ kind: "error", text: data?.error ?? "Failed to send." });
        return;
      }
      const r = data.result;
      if (r.total === 0) {
        setNotice({
          kind: "error",
          text:
            data.audience === "all"
              ? "No devices subscribed yet — students must enable push from Dashboard → Notifications first."
              : "This student has no device subscribed to push notifications.",
        });
        return;
      }
      setNotice({
        kind: "success",
        text: `Sent to ${r.sent} device(s)` + (r.failed > 0 ? `, ${r.failed} failed.` : "."),
      });
      setTitle("");
      setBody("");
      setUrl("");
      void load();
      setTargetCount(null);
    } catch {
      setNotice({ kind: "error", text: "Failed to send the notification." });
    } finally {
      setBusy(false);
    }
  }

  if (!gate.ready) return null;

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <header>
        <h2 className="text-2xl font-extrabold tracking-tight text-[#0b1e3a] admin-dark:text-white">
          Push Notifications
        </h2>
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-500 admin-dark:text-slate-400">
          Send a Firebase Cloud Messaging notification — broadcast to everyone,
          or target one student. Students opt in from Dashboard → Notifications.
        </p>
      </header>

      <div className={`${cardClass} mt-5 p-4 text-sm`}>
        <span className="font-bold">{count === null ? "…" : count}</span>{" "}
        <span className="text-slate-500">device(s) currently subscribed in total.</span>
      </div>

      <div className={`${cardClass} mt-5 space-y-4 p-5`}>
        {/* Audience */}
        <div>
          <span className={labelClass}>Send to</span>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["broadcast", "📢 Broadcast (everyone)"],
                ["specific", "🎯 Specific student"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setAudience(value)}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                  audience === value
                    ? "bg-primary-600 text-white shadow"
                    : "border border-neutral-200 text-zinc-600 hover:border-[#93c5fd] admin-dark:border-zinc-700 admin-dark:text-zinc-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {audience === "specific" && (
          <div>
            <label className={labelClass} htmlFor="push-email">Student email</label>
            <input
              id="push-email"
              type="email"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@example.com"
            />
            {targetError && (
              <p className="mt-1.5 text-xs font-semibold text-red-500">{targetError}</p>
            )}
            {!targetError && targetCount !== null && (
              <p className="mt-1.5 text-xs font-semibold text-emerald-600 admin-dark:text-emerald-400">
                {targetCount} device(s) registered for this student.
              </p>
            )}
          </div>
        )}

        <div>
          <label className={labelClass} htmlFor="push-title">Title</label>
          <input
            id="push-title"
            className={inputClass}
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="New exam published!"
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="push-body">Message</label>
          <textarea
            id="push-body"
            rows={3}
            className={inputClass}
            maxLength={500}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Weekly test 5 is now live in your dashboard."
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="push-url">Link after tap (optional)</label>
          <input
            id="push-url"
            className={inputClass}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="/dashboard/notifications"
          />
        </div>

        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={!canSend}
          className={buttonPrimaryClass}
        >
          {busy
            ? "Sending…"
            : audience === "broadcast"
              ? `Send broadcast (${count ?? 0})`
              : `Send to ${email.trim() || "student"}${
                  targetCount !== null ? ` (${targetCount})` : ""
                }`}
        </button>
      </div>

      {notice && (
        <p role="status" className={noticeClass(notice)}>
          {notice.text}
        </p>
      )}
    </section>
  );
}
