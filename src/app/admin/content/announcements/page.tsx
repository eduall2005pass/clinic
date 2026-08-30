"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AccessLoading } from "@/components/auth/AccessGuard";
import { useAdminToast } from "@/components/admin/AdminToastProvider";

type Announcement = {
  id: string;
  title: string;
  description: string | null;
  buttonText: string | null;
  buttonHref: string | null;
  isActive: boolean;
  startAt: string | null;
  endAt: string | null;
};

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const inputClass =
  "w-full rounded-xl border border-ink/15 bg-[#f8fbff] admin-dark:bg-[#0f2547] px-3.5 py-2.5 text-sm text-heading outline-none focus:border-[#2f6bce]/60";
const labelClass =
  "text-xs font-semibold uppercase tracking-wide text-neutral-500";

/**
 * Admin → Content → Announcements. Full CRUD against /api/announcements →
 * MySQL `announcements` table. Published items appear in the website
 * Announcement Bar instantly.
 */
export default function AnnouncementsAdminPage() {
  const toast = useAdminToast();
  const { user, authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Announcement[] | null>(null);
  const [busy, setBusy] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null); // null = closed, "new" = create
  const [form, setForm] = useState({
    title: "",
    description: "",
    buttonText: "",
    buttonHref: "",
    startAt: "",
    endAt: "",
    isActive: true,
  });

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/announcements?all=1", {
        headers: { Authorization: `Bearer ${await user.getIdToken()}` },
        cache: "no-store",
      });
      if (!res.ok) throw new Error("failed");
      const data = (await res.json()) as { announcements?: Announcement[] };
      setItems(Array.isArray(data.announcements) ? data.announcements : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading || !user) return;
    void load();
  }, [authLoading, user, load]);

  function openNew() {
    setEditingId("new");
    setForm({
      title: "",
      description: "",
      buttonText: "",
      buttonHref: "",
      startAt: "",
      endAt: "",
      isActive: true,
    });
  }

  function openEdit(item: Announcement) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      description: item.description ?? "",
      buttonText: item.buttonText ?? "",
      buttonHref: item.buttonHref ?? "",
      startAt: toLocalInput(item.startAt),
      endAt: toLocalInput(item.endAt),
      isActive: item.isActive,
    });
  }

  async function save() {
    if (!user) return;
    if (form.title.trim().length === 0) {
      toast.showToast("error", "Title is required.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({
          id: editingId === "new" ? undefined : editingId,
          title: form.title.trim(),
          description: form.description.trim(),
          button_text: form.buttonText.trim(),
          button_href: form.buttonHref.trim(),
          is_active: form.isActive,
          start_at: form.startAt ? new Date(form.startAt).toISOString() : null,
          end_at: form.endAt ? new Date(form.endAt).toISOString() : null,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        announcements?: Announcement[];
      } | null;
      if (!res.ok) {
        toast.showToast("error", data?.error ?? "Failed to save the announcement.");
        return;
      }
      if (Array.isArray(data?.announcements)) setItems(data.announcements);
      toast.showToast(
        "success",
        editingId === "new" ? "Announcement published." : "Announcement updated.",
      );
      setEditingId(null);
    } catch {
      toast.showToast("error", "Network error.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(item: Announcement) {
    if (!user) return;
    try {
      const res = await fetch("/api/announcements", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({ updates: [{ id: item.id, isActive: !item.isActive }] }),
      });
      const data = (await res.json()) as { error?: string; announcements?: Announcement[] };
      if (!res.ok) {
        toast.showToast("error", data.error ?? "Failed to update.");
        return;
      }
      if (Array.isArray(data.announcements)) setItems(data.announcements);
      toast.showToast("success", item.isActive ? "Announcement hidden." : "Announcement shown.");
    } catch {
      toast.showToast("error", "Network error.");
    }
  }

  async function remove(item: Announcement) {
    if (!user) return;
    if (!window.confirm(`Delete the announcement "${item.title}"?`)) return;
    try {
      const res = await fetch("/api/announcements", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({ id: item.id }),
      });
      const data = (await res.json()) as { error?: string; announcements?: Announcement[] };
      if (!res.ok) {
        toast.showToast("error", data.error ?? "Failed to delete.");
        return;
      }
      if (Array.isArray(data.announcements)) setItems(data.announcements);
      toast.showToast("success", "Announcement deleted.");
    } catch {
      toast.showToast("error", "Network error.");
    }
  }

  if (authLoading || loading) {
    return <AccessLoading label="Loading announcements…" />;
  }

  return (
    <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-heading">Announcements</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Published announcements appear on the Main Website announcement bar.
          </p>
        </div>
        {editingId === null && (
          <button
            type="button"
            onClick={openNew}
            className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-primary-900/40 transition hover:bg-primary-700"
          >
            + Add Announcement
          </button>
        )}
      </div>

      {editingId !== null && (
        <div className="mt-6 rounded-2xl border border-[#dbeafe] bg-white shadow-sm shadow-[#0b1e3a]/5 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] p-6 shadow-lg shadow-black/20">
          <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-500">
            {editingId === "new" ? "New" : "Edit"} Announcement
          </h2>
          <div className="mt-4 grid gap-3">
            <label className="block">
              <span className={labelClass}>Title</span>
              <input
                className={`${inputClass} mt-1`}
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                placeholder="e.g. Admission batch starting soon"
              />
            </label>
            <label className="block">
              <span className={labelClass}>Description</span>
              <textarea
                rows={2}
                className={`${inputClass} mt-1 resize-none`}
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className={labelClass}>Button Text</span>
                <input
                  className={`${inputClass} mt-1`}
                  value={form.buttonText}
                  onChange={(event) => setForm({ ...form, buttonText: event.target.value })}
                  placeholder="optional"
                />
              </label>
              <label className="block">
                <span className={labelClass}>Button Link</span>
                <input
                  className={`${inputClass} mt-1`}
                  value={form.buttonHref}
                  onChange={(event) => setForm({ ...form, buttonHref: event.target.value })}
                  placeholder="/courses or https://…"
                />
              </label>
              <label className="block">
                <span className={labelClass}>Show From</span>
                <input
                  type="datetime-local"
                  className={`${inputClass} mt-1`}
                  value={form.startAt}
                  onChange={(event) => setForm({ ...form, startAt: event.target.value })}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Show Until</span>
                <input
                  type="datetime-local"
                  className={`${inputClass} mt-1`}
                  value={form.endAt}
                  onChange={(event) => setForm({ ...form, endAt: event.target.value })}
                />
              </label>
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
                className="h-4 w-4 accent-emerald-500"
              />
              <span className="text-xs font-semibold text-neutral-300">Active</span>
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void save()}
                disabled={busy}
                className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-primary-700 disabled:opacity-50"
              >
                {busy ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="rounded-xl border border-ink/15 px-5 py-2.5 text-sm font-bold text-neutral-300 hover:border-[#93c5fd]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 space-y-2">
        {items === null ? (
          <AccessLoading label="Loading…" />
        ) : items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-ink/15 px-4 py-8 text-center text-sm text-neutral-500">
            No announcements yet — add the first one.
          </p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-[#dbeafe] bg-white shadow-sm shadow-[#0b1e3a]/5 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-heading">
                  {item.title}{" "}
                  {!item.isActive && (
                    <span className="ml-1 rounded-full bg-yellow-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-yellow-300">
                      off
                    </span>
                  )}
                </p>
                {item.description && (
                  <p className="truncate text-xs text-neutral-400">{item.description}</p>
                )}
                {(item.startAt || item.endAt) && (
                  <p className="text-[11px] text-neutral-500">
                    {item.startAt ? new Date(item.startAt).toLocaleString("en-GB") : "—"} →{" "}
                    {item.endAt ? new Date(item.endAt).toLocaleString("en-GB") : "—"}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => void toggleActive(item)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
                  item.isActive ? "bg-emerald-500" : "bg-zinc-600"
                }`}
                aria-label={`Toggle ${item.title}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                    item.isActive ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
              <button
                type="button"
                onClick={() => openEdit(item)}
                className="rounded-lg border border-ink/15 px-3 py-1.5 text-xs font-bold text-heading hover:border-[#93c5fd]"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => void remove(item)}
                className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-500/20"
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
