"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdminGate, noticeClass, cardClass, inputClass, labelClass, buttonPrimaryClass, type Notice } from "@/components/admin/admin-ui";

type SendResult = { sent: number; failed: number; total: number };

export default function PushManager() {
  const gate = useAdminGate();
  const [count, setCount] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/push", {
        headers: gate.headers,
        cache: "no-store",
      });
      const data = (await response.json()) as { count?: number };
      setCount(data.count ?? 0);
    } catch {
      setCount(null);
    }
  }, [gate.headers]);

  useEffect(() => {
    if (gate.ready) void load();
  }, [gate.ready, load]);

  async function handleSend() {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/push", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...gate.headers },
        body: JSON.stringify({ title, body, url: url.trim() || undefined }),
      });
      const data = (await response.json().catch(() => null)) as
        | { error?: string; result?: SendResult }
        | null;
      if (!response.ok || !data?.result) {
        setNotice({ kind: "error", text: data?.error ?? "Failed to send." });
        return;
      }
      setNotice({
        kind: "success",
        text: `Sent to ${data.result.sent} device(s)` +
          (data.result.failed > 0 ? `, ${data.result.failed} failed.` : "."),
      });
      setTitle("");
      setBody("");
      setUrl("");
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
        <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 admin-dark:text-zinc-50">
          Push Notifications
        </h2>
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-zinc-500 admin-dark:text-zinc-400">
          Broadcast a Firebase Cloud Messaging notification to every subscribed
          browser. Students opt in from Dashboard → Notifications.
        </p>
      </header>

      <div className={`${cardClass} mt-5 p-4 text-sm`}>
        <span className="font-bold">{count === null ? "…" : count}</span>{" "}
        <span className="text-zinc-500">device(s) currently subscribed.</span>
      </div>

      <div className={`${cardClass} mt-5 space-y-4 p-5`}>
        <div>
          <label className={labelClass} htmlFor="push-title">Title</label>
          <input id="push-title" className={inputClass} maxLength={120}
            value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="New exam published!" />
        </div>
        <div>
          <label className={labelClass} htmlFor="push-body">Message</label>
          <textarea id="push-body" rows={3} className={inputClass} maxLength={500}
            value={body} onChange={(e) => setBody(e.target.value)}
            placeholder="Weekly test 5 is now live in your dashboard." />
        </div>
        <div>
          <label className={labelClass} htmlFor="push-url">Link after tap (optional)</label>
          <input id="push-url" className={inputClass} value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="/dashboard/notifications" />
        </div>
        <button type="button" onClick={() => void handleSend()} disabled={busy || count === 0}
          className={buttonPrimaryClass}>
          {busy ? "Sending…" : `Send to all (${count ?? 0})`}
        </button>
      </div>

      {notice && <p role="status" className={noticeClass(notice)}>{notice.text}</p>}
    </section>
  );
}
