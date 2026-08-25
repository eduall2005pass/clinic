"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AccessLoading, AccessMessage } from "@/components/auth/AccessGuard";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import AdminConfirmDialog from "@/components/admin/AdminConfirmDialog";
import type { Announcement } from "@/lib/announcements";

type AnnouncementDraft = {
  id: string;
  title: string;
  description: string;
  buttonText: string;
  buttonHref: string;
  isActive: boolean;
  startAt: string; // datetime-local format
  endAt: string;
};

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const EMPTY_FORM = {
  title: "",
  description: "",
  buttonText: "",
  buttonHref: "",
  isActive: true,
  startAt: "",
  endAt: "",
};

export default function PopupAnnouncementManagementPage() {
  const { user, authLoading } = useAuth();
  const toast = useAdminToast();
  const [adminStatus, setAdminStatus] = useState<"checking" | "admin" | "denied">("checking");
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<AnnouncementDraft[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AnnouncementDraft | null>(null);

  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [adding, setAdding] = useState(false);

  // Admin check
  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    user
      .getIdToken()
      .then((token) =>
        fetch("/api/admin", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }),
      )
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { isAdmin?: boolean } | null) => {
        if (!cancelled) setAdminStatus(data?.isAdmin ? "admin" : "denied");
      })
      .catch(() => {
        if (!cancelled) setAdminStatus("denied");
      });
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  // Load all announcements
  useEffect(() => {
    if (adminStatus !== "admin") return;
    let cancelled = false;
    async function load() {
      try {
        const token = user ? await user.getIdToken() : null;
        const res = await fetch("/api/announcements/all", {
          cache: "no-store",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const data = (await res.json()) as { announcements?: Announcement[] };
        if (!cancelled && data.announcements) {
          setAnnouncements(
            data.announcements.map(toDraft),
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [adminStatus, user]);

  function toDraft(announcement: Announcement): AnnouncementDraft {
    return {
      id: announcement.id,
      title: announcement.title,
      description: announcement.description ?? "",
      buttonText: announcement.buttonText ?? "",
      buttonHref: announcement.buttonHref ?? "",
      isActive: announcement.isActive,
      startAt: toLocalInput(announcement.startAt),
      endAt: toLocalInput(announcement.endAt),
    };
  }

  if (authLoading || adminStatus === "checking" || (adminStatus === "admin" && loading)) {
    return <AccessLoading label="Loading announcements…" />;
  }

  if (adminStatus === "denied") {
    return (
      <AccessMessage
        title="Administrators only"
        message="Popup / Announcement management is restricted to authorized administrators."
        actionLabel="Back to Admin Home"
        actionHref="/admin"
      />
    );
  }

  if (!announcements) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <p className="text-center text-sm font-semibold text-red-500">
          Failed to load announcements. Please refresh the page.
        </p>
      </section>
    );
  }

  async function handleAdd() {
    if (!user) return;
    if (form.title.trim().length === 0) {
      toast.showToast("error", "Title is required.");
      return;
    }
    setAdding(true);
    setNotice(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/announcements", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || null,
          button_text: form.buttonText.trim() || null,
          button_href: form.buttonHref.trim() || null,
          is_active: form.isActive,
          start_at: form.startAt || null,
          end_at: form.endAt || null,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        announcements?: Announcement[];
      };
      if (!response.ok) {
        toast.showToast("error", data.error ?? "Failed to add the announcement.");
        return;
      }
      setAnnouncements((data.announcements ?? []).map(toDraft));
      setForm({ ...EMPTY_FORM });
      toast.showToast(
        "success",
        form.isActive
          ? "Announcement created — now live on the website."
          : "Announcement created as disabled.",
      );
    } catch {
      toast.showToast("error", "Failed to add the announcement.");
    } finally {
      setAdding(false);
    }
  }

  function patchAnnouncement(id: string, patch: Partial<AnnouncementDraft>) {
    setAnnouncements((prev) =>
      prev
        ? prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
        : prev,
    );
  }

  function moveAnnouncement(index: number, direction: -1 | 1) {
    setAnnouncements((prev) => {
      if (!prev) return prev;
      const items = [...prev];
      const target = index + direction;
      if (target < 0 || target >= items.length) return prev;
      [items[index], items[target]] = [items[target], items[index]];
      return items;
    });
  }

  async function handleSaveEdit(announcement: AnnouncementDraft) {
    if (!user) return;
    setBusyIds((prev) => new Set(prev).add(announcement.id));
    setNotice(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/announcements", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: announcement.id,
          title: announcement.title.trim(),
          description: announcement.description.trim() || null,
          button_text: announcement.buttonText.trim() || null,
          button_href: announcement.buttonHref.trim() || null,
          is_active: announcement.isActive,
          start_at: announcement.startAt || null,
          end_at: announcement.endAt || null,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        announcements?: Announcement[];
      };
      if (!response.ok) {
        toast.showToast("error", data.error ?? "Failed to save the announcement.");
        return;
      }
      setAnnouncements((data.announcements ?? []).map(toDraft));
      toast.showToast("success", "Announcement updated.");
    } catch {
      toast.showToast("error", "Failed to save the announcement.");
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(announcement.id);
        return next;
      });
    }
  }

  async function toggleActive(announcement: AnnouncementDraft) {
    if (!user) return;
    setBusyIds((prev) => new Set(prev).add(announcement.id));
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/announcements", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          updates: [{ id: announcement.id, isActive: !announcement.isActive }],
        }),
      });
      if (!response.ok) {
        toast.showToast("error", "Failed to update the announcement.");
        return;
      }
      setAnnouncements((prev) =>
        prev
          ? prev.map((item) =>
              item.id === announcement.id
                ? { ...item, isActive: !item.isActive }
                : item,
            )
          : prev,
      );
      toast.showToast(
        "success",
        !announcement.isActive ? "Announcement enabled." : "Announcement disabled.",
      );
    } catch {
      toast.showToast("error", "Failed to update the announcement.");
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(announcement.id);
        return next;
      });
    }
  }

  async function handleDelete(announcement: AnnouncementDraft) {
    if (!user) return;
    setBusyIds((prev) => new Set(prev).add(announcement.id));
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/announcements", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: announcement.id }),
      });
      const data = (await response.json()) as {
        error?: string;
        announcements?: Announcement[];
      };
      if (!response.ok) {
        toast.showToast("error", data.error ?? "Failed to delete the announcement.");
        return;
      }
      setAnnouncements((data.announcements ?? []).map(toDraft));
      toast.showToast("success", "Announcement deleted.");
    } catch {
      toast.showToast("error", "Failed to delete the announcement.");
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(announcement.id);
        return next;
      });
    }
  }

  async function handleSaveOrder() {
    if (!user || !announcements) return;
    setSaving(true);
    setNotice(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/announcements", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          order: announcements.map((announcement) => announcement.id),
        }),
      });
      if (!response.ok) {
        toast.showToast("error", "Failed to save the order.");
        return;
      }
      toast.showToast("success", "Display order saved.");
    } catch {
      toast.showToast("error", "Failed to save the order.");
    } finally {
      setSaving(false);
    }
  }

  const cardClass =
    "rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition-colors duration-300 sm:p-6 admin-dark:border-zinc-800 admin-dark:bg-zinc-900";
  const inputClass =
    "mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-primary-500/60 focus:bg-white admin-dark:border-zinc-700 admin-dark:bg-zinc-800 admin-dark:text-zinc-100";
  const labelClass =
    "text-[11px] font-bold uppercase tracking-wider text-zinc-400";

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      {/* Page header */}
      <header>
        <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 admin-dark:text-zinc-50">
          Popup / Announcement
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-zinc-500 admin-dark:text-zinc-400">
          Create announcements shown at the top of the live website. Only
          enabled announcements within their date window are displayed.
        </p>
      </header>

      {/* Add announcement */}
      <div className={`${cardClass} mt-6`}>
        <h3 className="text-sm font-extrabold text-zinc-900 admin-dark:text-zinc-100">
          New Announcement
        </h3>
        <div className="mt-4 grid gap-3">
          <label className="block">
            <span className={labelClass}>Title *</span>
            <input
              type="text"
              value={form.title}
              maxLength={255}
              placeholder="Exam registration is now open!"
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className={labelClass}>Description</span>
            <textarea
              value={form.description}
              rows={2}
              maxLength={1000}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              className={`${inputClass} resize-none`}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={labelClass}>Button Text</span>
              <input
                type="text"
                value={form.buttonText}
                maxLength={100}
                placeholder="Register Now"
                onChange={(event) => setForm({ ...form, buttonText: event.target.value })}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Button Link</span>
              <input
                type="text"
                value={form.buttonHref}
                maxLength={1024}
                placeholder="/exam or https://…"
                onChange={(event) => setForm({ ...form, buttonHref: event.target.value })}
                className={inputClass}
              />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={labelClass}>Start Date</span>
              <input
                type="datetime-local"
                value={form.startAt}
                onChange={(event) => setForm({ ...form, startAt: event.target.value })}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className={labelClass}>End Date</span>
              <input
                type="datetime-local"
                value={form.endAt}
                onChange={(event) => setForm({ ...form, endAt: event.target.value })}
                className={inputClass}
              />
            </label>
          </div>
          <label className="flex w-fit cursor-pointer items-center gap-2 text-sm font-semibold text-zinc-600 admin-dark:text-zinc-300">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
              className="h-4 w-4 accent-primary-600"
            />
            Enable immediately
          </label>
          <button
            type="button"
            onClick={handleAdd}
            disabled={adding}
            className="w-fit rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary-900/30 transition hover:bg-primary-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {adding ? "Creating…" : "Create Announcement"}
          </button>
        </div>
      </div>

      {/* Existing announcements */}
      <div className="mt-8 flex items-center justify-between gap-3">
        <h3 className="text-sm font-extrabold text-zinc-900 admin-dark:text-zinc-100">
          All Announcements ({announcements.length})
        </h3>
        <button
          type="button"
          onClick={handleSaveOrder}
          disabled={saving}
          className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-bold text-zinc-600 transition hover:border-primary-500/50 hover:text-primary-600 disabled:opacity-60 admin-dark:border-zinc-700 admin-dark:text-zinc-300"
        >
          {saving ? "Saving…" : "Save Order"}
        </button>
      </div>

      <ul className="mt-3 space-y-3">
        {announcements.length === 0 && (
          <li className={cardClass}>
            <p className="py-4 text-center text-sm font-semibold text-zinc-500">
              No announcements yet. Create the first one above.
            </p>
          </li>
        )}
        {announcements.map((announcement, index) => {
          const busy = busyIds.has(announcement.id);
          return (
            <li key={announcement.id} className={`${cardClass} ${announcement.isActive ? "" : "opacity-75"}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-lg bg-neutral-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 admin-dark:bg-zinc-800">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p className="min-w-0 flex-1 truncate text-sm font-bold text-zinc-900 admin-dark:text-zinc-100">
                  {announcement.title}
                </p>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    aria-label={`Move announcement ${index + 1} up`}
                    onClick={() => moveAnnouncement(index, -1)}
                    disabled={index === 0}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-200 bg-white text-xs text-zinc-600 transition hover:border-primary-500/50 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-40 admin-dark:border-zinc-700 admin-dark:bg-zinc-900 admin-dark:text-zinc-300"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    aria-label={`Move announcement ${index + 1} down`}
                    onClick={() => moveAnnouncement(index, 1)}
                    disabled={index === announcements.length - 1}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-200 bg-white text-xs text-zinc-600 transition hover:border-primary-500/50 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-40 admin-dark:border-zinc-700 admin-dark:bg-zinc-900 admin-dark:text-zinc-300"
                  >
                    ▼
                  </button>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={announcement.isActive}
                    aria-label={`Toggle announcement ${index + 1}`}
                    onClick={() => toggleActive(announcement)}
                    className={`relative ml-1 inline-flex h-6 w-11 items-center rounded-full transition ${
                      announcement.isActive
                        ? "bg-primary-600"
                        : "bg-zinc-300 admin-dark:bg-zinc-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                        announcement.isActive ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="mt-3 grid gap-3">
                <label className="block">
                  <span className={labelClass}>Title *</span>
                  <input
                    type="text"
                    value={announcement.title}
                    maxLength={255}
                    onChange={(event) =>
                      patchAnnouncement(announcement.id, { title: event.target.value })
                    }
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className={labelClass}>Description</span>
                  <textarea
                    value={announcement.description}
                    rows={2}
                    maxLength={1000}
                    onChange={(event) =>
                      patchAnnouncement(announcement.id, { description: event.target.value })
                    }
                    className={`${inputClass} resize-none`}
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className={labelClass}>Button Text</span>
                    <input
                      type="text"
                      value={announcement.buttonText}
                      maxLength={100}
                      onChange={(event) =>
                        patchAnnouncement(announcement.id, { buttonText: event.target.value })
                      }
                      className={inputClass}
                    />
                  </label>
                  <label className="block">
                    <span className={labelClass}>Button Link</span>
                    <input
                      type="text"
                      value={announcement.buttonHref}
                      maxLength={1024}
                      onChange={(event) =>
                        patchAnnouncement(announcement.id, { buttonHref: event.target.value })
                      }
                      className={inputClass}
                    />
                  </label>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className={labelClass}>Start Date</span>
                    <input
                      type="datetime-local"
                      value={announcement.startAt}
                      onChange={(event) =>
                        patchAnnouncement(announcement.id, { startAt: event.target.value })
                      }
                      className={inputClass}
                    />
                  </label>
                  <label className="block">
                    <span className={labelClass}>End Date</span>
                    <input
                      type="datetime-local"
                      value={announcement.endAt}
                      onChange={(event) =>
                        patchAnnouncement(announcement.id, { endAt: event.target.value })
                      }
                      className={inputClass}
                    />
                  </label>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-3 admin-dark:border-zinc-800">
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                    announcement.isActive
                      ? "bg-emerald-500/10 text-emerald-600 admin-dark:text-emerald-400"
                      : "bg-zinc-100 text-zinc-500 admin-dark:bg-zinc-800 admin-dark:text-zinc-400"
                  }`}
                >
                  {announcement.isActive ? "Enabled" : "Disabled"}
                </span>
                <button
                  type="button"
                  onClick={() => handleSaveEdit(announcement)}
                  disabled={busy}
                  className="ml-auto rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-primary-700 disabled:opacity-40"
                >
                  {busy ? "Saving…" : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(announcement)}
                  disabled={busy}
                  className="rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-1.5 text-xs font-bold text-red-500 transition hover:bg-red-500/15 disabled:opacity-40"
                >
                  Delete
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {notice && (
        <p
          role="status"
          className={`mt-6 rounded-xl border px-4 py-3 text-sm font-semibold ${
            notice.kind === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 admin-dark:text-emerald-400"
              : "border-red-500/30 bg-red-500/10 text-red-600 admin-dark:text-red-400"
          }`}
        >
          {notice.text}
        </p>
      )}

      <AdminConfirmDialog
        open={deleteTarget !== null}
        title="Delete this announcement?"
        message={
          deleteTarget
            ? `"${deleteTarget.title}" will be removed permanently.`
            : ""
        }
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          if (deleteTarget) handleDelete(deleteTarget);
        }}
        onClose={() => setDeleteTarget(null)}
      />
    </section>
  );
}
