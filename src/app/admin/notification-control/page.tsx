"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AccessLoading } from "@/components/auth/AccessGuard";
import { useAdminToast } from "@/components/admin/AdminToastProvider";

type Notification = {
  id: string;
  title: string;
  message: string;
  audience: string;
  targetEmail?: string | null;
  isActive: boolean;
};

type Student = {
  uid: string;
  fullName?: string;
  name?: string;
  email?: string;
  isActive?: number | boolean | null;
};

type Mode = "all" | "enrolled" | "specific";

const MODES: Array<{ key: Mode; label: string; description: string }> = [
  { key: "all", label: "All Student", description: "Send to every MediSpark student." },
  { key: "enrolled", label: "Enrolled Student", description: "Send to students with active enrollments." },
  { key: "specific", label: "Specific Student", description: "Pick one student and notify them." },
];

export default function NotificationControlPage() {
  const toast = useAdminToast();
  const { user, authLoading } = useAuth();
  const [mode, setMode] = useState<Mode>("all");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [studentEmail, setStudentEmail] = useState("");
  const [notifications, setNotifications] = useState<Notification[] | null>(null);
  const [busy, setBusy] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/admin/notifications?all=1", {
        headers: { Authorization: `Bearer ${await user.getIdToken()}` },
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as { notifications?: Notification[] };
      setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
    } catch {
      // keep previous
    }
  }, [user]);

  useEffect(() => {
    if (authLoading || !user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadNotifications();
    (async () => {
      try {
        const res = await fetch("/api/admin/students?status=all", {
          headers: { Authorization: `Bearer ${await user.getIdToken()}` },
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { students?: Student[] };
        setStudents(Array.isArray(data.students) ? data.students : []);
      } catch {
        // selector stays empty
      }
    })();
  }, [authLoading, user, loadNotifications]);

  async function handleSend() {
    if (!user) return;
    if (title.trim().length < 2 || message.trim().length < 2) {
      toast.showToast("error", "Title and message are required.");
      return;
    }
    if (mode === "specific" && !studentEmail) {
      toast.showToast("error", "Select a student first.");
      return;
    }
    setBusy(true);
    try {
      const auth = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${await user.getIdToken()}`,
      };
      if (mode === "specific") {
        const selectedStudent =
          students.find((s) => s.email === studentEmail) ?? null;
        // 1) Persist to the student's inbox (audience "student").
        const inboxRes = await fetch("/api/admin/notifications", {
          method: "POST",
          headers: auth,
          body: JSON.stringify({
            title: title.trim(),
            message: message.trim(),
            audience: "student",
            targetUid: selectedStudent?.uid,
            targetEmail: studentEmail,
            isActive: true,
          }),
        });
        const inboxData = (await inboxRes.json().catch(() => null)) as {
          error?: string;
        } | null;
        if (!inboxRes.ok) {
          toast.showToast("error", inboxData?.error ?? "Failed to save.");
          return;
        }
        // 2) Best-effort web push to the student's registered devices.
        try {
          await fetch("/api/admin/push", {
            method: "POST",
            headers: auth,
            body: JSON.stringify({
              title: title.trim(),
              body: message.trim(),
              audience: "specific",
              email: studentEmail,
            }),
          });
        } catch {
          // Push is optional — the inbox notification is already stored.
        }
        toast.showToast(
          "success",
          `Notification sent to ${selectedStudent?.fullName ?? studentEmail}.`,
        );
        await loadNotifications();
      } else {
        // In-app broadcast — "all" students or only actively enrolled ones.
        const audience = mode === "all" ? "all" : "enrolled";
        const res = await fetch("/api/admin/notifications", {
          method: "POST",
          headers: auth,
          body: JSON.stringify({
            title: title.trim(),
            message: message.trim(),
            audience,
            isActive: true,
          }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          toast.showToast("error", data.error ?? "Failed to save.");
          return;
        }
        toast.showToast("success", "Notification published. Students will see it now.");
        await loadNotifications();
      }
      setTitle("");
      setMessage("");
      setStudentEmail("");
    } catch {
      toast.showToast("error", "Failed to send the notification.");
    } finally {
      setBusy(false);
    }
  }

  async function removeNotification(id: string) {
    if (!user) return;
    try {
      await fetch("/api/admin/notifications", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({ id }),
      });
      await loadNotifications();
      toast.showToast("success", "Notification removed.");
    } catch {
      toast.showToast("error", "Failed to remove.");
    }
  }

  if (authLoading) {
    return <AccessLoading label="Loading Notification Control…" />;
  }

  return (
    <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-extrabold text-heading">Notification Control</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Send and manage notifications for all students, enrolled students or a
        specific student.
      </p>

      {/* Mode tabs */}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {MODES.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setMode(item.key)}
            aria-pressed={mode === item.key}
            className={`rounded-2xl border p-4 text-left transition ${
              mode === item.key
                ? "border-primary-500/60 bg-primary-600/10"
                : "border-ink/10 bg-white admin-dark:bg-[#112544] hover:border-primary-500/40"
            }`}
          >
            <p className={`text-sm font-bold ${mode === item.key ? "text-primary-300" : "text-heading"}`}>
              {item.label}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-neutral-400">
              {item.description}
            </p>
          </button>
        ))}
      </div>

      {/* Compose */}
      <div className="mt-6 rounded-2xl border border-[#dbeafe] bg-white shadow-sm shadow-[#0b1e3a]/5 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] p-6 shadow-lg shadow-black/20">
        <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-500">
          {MODES.find((m) => m.key === mode)?.label} Notification
        </h2>
        <div className="mt-4 grid gap-3">
          <label className="block">
            <span className="text-xs font-semibold text-neutral-500">Title</span>
            <input
              type="text"
              value={title}
              maxLength={120}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Notification title…"
              className="mt-1 w-full rounded-xl border border-ink/15 bg-[#f8fbff] admin-dark:bg-[#0f2547] px-3.5 py-2.5 text-sm text-heading outline-none focus:border-[#2f6bce]/60"
            />
          </label>
          {mode === "specific" && (
            <label className="block">
              <span className="text-xs font-semibold text-neutral-500">Select Student</span>
              <select
                value={studentEmail}
                onChange={(event) => setStudentEmail(event.target.value)}
                className="mt-1 w-full rounded-xl border border-ink/15 bg-[#f8fbff] admin-dark:bg-[#0f2547] px-3.5 py-2.5 text-sm text-heading outline-none focus:border-[#2f6bce]/60"
              >
                <option value="">Choose a student…</option>
                {students.map((student) => (
                  <option key={student.uid} value={student.email ?? ""}>
                    {student.fullName || student.name} {student.email ? `(${student.email})` : ""}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block">
            <span className="text-xs font-semibold text-neutral-500">Message</span>
            <textarea
              value={message}
              rows={3}
              maxLength={500}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Write the notification message…"
              className="mt-1 w-full resize-none rounded-xl border border-ink/15 bg-[#f8fbff] admin-dark:bg-[#0f2547] px-3.5 py-2.5 text-sm text-heading outline-none focus:border-[#2f6bce]/60"
            />
          </label>
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={busy}
            className="w-fit rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary-900/40 transition hover:bg-primary-700 disabled:opacity-50"
          >
            {busy ? "Sending…" : "Send Notification"}
          </button>
        </div>
      </div>

      {/* Sent notifications list */}
      <div className="mt-6 rounded-2xl border border-[#dbeafe] bg-white shadow-sm shadow-[#0b1e3a]/5 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] p-6">
        <h2 className="text-lg font-bold text-heading">Sent Notifications</h2>
        {notifications === null ? (
          <AccessLoading label="Loading notifications…" />
        ) : notifications.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-ink/15 px-4 py-6 text-center text-sm text-neutral-500">
            No notifications sent yet.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {notifications.map((notification) => (
              <li
                key={notification.id}
                className="flex items-start gap-3 rounded-xl border border-ink/10 bg-[#f1f5f9] admin-dark:bg-[#0a162e]/60 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-heading">
                    {notification.title}
                  </p>
                  <p className="line-clamp-2 text-xs text-neutral-400">{notification.message}</p>
                  <span className="mt-1 inline-block rounded-md bg-ink/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-neutral-400">
                    {notification.audience}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => void removeNotification(notification.id)}
                  className="shrink-0 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-1.5 text-xs font-bold text-red-400 transition hover:bg-red-500/15"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
