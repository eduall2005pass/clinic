"use client";

import { useCallback, useEffect, useState } from "react";
import { AccessLoading, AccessMessage } from "@/components/auth/AccessGuard";
import {
  useAdminGate,
  noticeClass,
  cardClass,
  inputClass,
  buttonPrimaryClass,
  buttonDangerClass,
  type Notice,
} from "@/components/admin/admin-ui";
import { MediaUploadField } from "@/components/admin/MediaUploadField";

type Jersey = { id: string; name: string; note: string | null; image: string | null; link: string | null; price: number; isActive: boolean };

type HomepageSection = {
  key: string;
  title?: string | null;
  description?: string | null;
  isActive: boolean;
};

const EMPTY = { id: "", name: "", note: "", image: "", link: "", price: "0" };

export default function JerseyPage() {
  const gate = useAdminGate();
  const [jerseys, setJerseys] = useState<Jersey[] | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [sectionActive, setSectionActive] = useState<boolean | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/jerseys", { cache: "no-store", headers: gate.headers });
      const data = (await response.json()) as { jerseys?: Jersey[] };
      setJerseys(data.jerseys ?? []);
    } catch {
      setJerseys([]);
    }
    try {
      const response = await fetch("/api/homepage-sections", { cache: "no-store" });
      const data = (await response.json()) as { sections?: HomepageSection[] };
      const jerseySection = data.sections?.find((section) => section.key === "jersey");
      setSectionActive(jerseySection ? jerseySection.isActive : true);
    } catch {
      // Leave unknown.
    }
  }, []);

  useEffect(() => {
    if (gate.ready) void Promise.resolve().then(load);
  }, [gate.ready, load]);

  if (!gate.ready) {
    return gate.denied ? (
      <AccessMessage title="Administrators only" message="Restricted to authorized administrators." actionLabel="Back to Admin Home" actionHref="/admin" />
    ) : (
      <AccessLoading label="Loading jerseys…" />
    );
  }

  async function save() {
    if (!form.name.trim()) {
      setNotice({ kind: "error", text: "Enter a jersey name." });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/jerseys", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...gate.headers },
        body: JSON.stringify({
          ...(form.id ? { id: form.id } : {}),
          name: form.name,
          note: form.note,
          image: form.image,
          link: form.link,
          price: Number(form.price) || 0,
          isActive: true,
        }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string; jerseys?: Jersey[] } | null;
      if (!response.ok) {
        setNotice({ kind: "error", text: data?.error ?? "Failed to save." });
        return;
      }
      setJerseys(data?.jerseys ?? []);
      setForm(EMPTY);
      setNotice({ kind: "success", text: form.id ? "Jersey updated. The home page now shows the latest version." : "Jersey saved." });
    } catch {
      setNotice({ kind: "error", text: "Network error — could not save the jersey." });
    } finally {
      setBusy(false);
    }
  }

  function startEdit(jersey: Jersey) {
    setForm({
      id: jersey.id,
      name: jersey.name,
      note: jersey.note ?? "",
      image: jersey.image ?? "",
      link: jersey.link ?? "",
      price: String(jersey.price ?? 0),
    });
    setNotice(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function toggleJersey(jersey: Jersey) {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/jerseys", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...gate.headers },
        body: JSON.stringify({
          id: jersey.id,
          name: jersey.name,
          note: jersey.note ?? "",
          image: jersey.image ?? "",
          link: jersey.link ?? "",
          price: jersey.price,
          isActive: !jersey.isActive,
        }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string; jerseys?: Jersey[] } | null;
      if (!response.ok) {
        setNotice({ kind: "error", text: data?.error ?? "Failed to update." });
        return;
      }
      setJerseys(data?.jerseys ?? []);
      setNotice({ kind: "success", text: `“${jersey.name}” ${jersey.isActive ? "disabled" : "enabled"}.` });
    } finally {
      setBusy(false);
    }
  }

  async function toggleSection() {
    setBusy(true);
    setNotice(null);
    try {
      const current = await fetch("/api/homepage-sections", { cache: "no-store" });
      const data = (await current.json()) as { sections?: HomepageSection[] };
      const sections = data.sections ?? [];
      const updated = sections.map((section) =>
        section.key === "jersey"
          ? { ...section, isActive: !(sectionActive ?? true) }
          : section,
      );
      if (!updated.some((section) => section.key === "jersey")) {
        updated.push({ key: "jersey", isActive: !(sectionActive ?? true) });
      }
      const response = await fetch("/api/homepage-sections", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...gate.headers },
        body: JSON.stringify({ sections: updated }),
      });
      if (!response.ok) {
        const errData = (await response.json().catch(() => null)) as { error?: string } | null;
        setNotice({ kind: "error", text: errData?.error ?? "Failed to update the section." });
        return;
      }
      setSectionActive((prev) => !(prev ?? true));
      setNotice({
        kind: "success",
        text: `Jersey section ${sectionActive ? "hidden from" : "visible on"} the home page.`,
      });
    } catch {
      setNotice({ kind: "error", text: "Network error — could not update the section." });
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this jersey?")) return;
    setBusy(true);
    try {
      const response = await fetch("/api/admin/jerseys", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...gate.headers },
        body: JSON.stringify({ id }),
      });
      const data = (await response.json().catch(() => null)) as { jerseys?: Jersey[] } | null;
      if (data?.jerseys) setJerseys(data.jerseys);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 admin-dark:text-zinc-50">Jerseys</h2>
          <p className="mt-1.5 text-sm text-zinc-500 admin-dark:text-zinc-400">Merchandise jerseys shown on the website.</p>
        </div>
        {sectionActive !== null && (
          <button
            type="button"
            onClick={() => void toggleSection()}
            disabled={busy}
            aria-pressed={sectionActive}
            className={`rounded-xl border px-4 py-2.5 text-xs font-extrabold uppercase tracking-wide transition ${
              sectionActive
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                : "border-zinc-400/40 bg-zinc-500/10 text-zinc-500 hover:bg-zinc-500/20"
            }`}
          >
            {sectionActive ? "Section: Visible" : "Section: Hidden"}
          </button>
        )}
      </header>

      <div className={`${cardClass} mt-5 p-4 sm:p-5`}>
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-zinc-400">
          {form.id ? "Update jersey" : "Add jersey"}
        </h3>
        <form
          className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <div>
            <label className="sr-only" htmlFor="jy-name">Name</label>
            <input id="jy-name" className={inputClass} placeholder="Name" value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </div>
          <div>
            <label className="sr-only" htmlFor="jy-price">Price</label>
            <input id="jy-price" type="number" min="0" className={inputClass} placeholder="Price ৳" value={form.price}
              onChange={(event) => setForm({ ...form, price: event.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <MediaUploadField
              id="jy-image"
              label="Jersey image"
              value={form.image}
              onChange={(url) => setForm({ ...form, image: url })}
              directory="jerseys"
              preview
            />
          </div>
          <div className="sm:col-span-2">
            <label className="sr-only" htmlFor="jy-note">Note</label>
            <input id="jy-note" className={inputClass} placeholder="Short note / description" value={form.note}
              onChange={(event) => setForm({ ...form, note: event.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="sr-only" htmlFor="jy-link">Order link</label>
            <input id="jy-link" type="url" className={inputClass} placeholder="Order link (optional, e.g. https://wa.me/…)" value={form.link}
              onChange={(event) => setForm({ ...form, link: event.target.value })} />
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" disabled={busy} className={buttonPrimaryClass}>{busy ? "Saving…" : form.id ? "Update Jersey" : "+ Add Jersey"}</button>
            {form.id && (
              <button type="button" disabled={busy} className={buttonDangerClass}
                onClick={() => { setForm(EMPTY); setNotice(null); }}>Cancel</button>
            )}
          </div>
        </form>
      </div>

      <ul className="mt-5 space-y-2">
        {(jerseys ?? []).map((jersey) => (
          <li key={jersey.id} className={`${cardClass} flex items-center gap-3 px-4 py-3`}>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-zinc-900 admin-dark:text-zinc-100">{jersey.name}</span>
              <span className="block truncate text-xs text-zinc-500">
                ৳ {jersey.price.toLocaleString("en-IN")}{jersey.note ? ` · ${jersey.note}` : ""}{!jersey.isActive ? " · hidden" : ""}
              </span>
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${
                jersey.isActive
                  ? "bg-emerald-500/10 text-emerald-600"
                  : "bg-zinc-500/10 text-zinc-500"
              }`}
            >
              {jersey.isActive ? "Active" : "Disabled"}
            </span>
            <button
              type="button"
              disabled={busy}
              aria-label={jersey.isActive ? `Disable ${jersey.name}` : `Enable ${jersey.name}`}
              className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                jersey.isActive
                  ? "border-yellow-500/40 text-yellow-600 hover:bg-yellow-500/10"
                  : "border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10"
              }`}
              onClick={() => void toggleJersey(jersey)}
            >
              {jersey.isActive ? "Disable" : "Enable"}
            </button>
            <button type="button" disabled={busy} aria-label={`Edit ${jersey.name}`} className={buttonPrimaryClass}
              onClick={() => startEdit(jersey)}>Edit</button>
            <button type="button" disabled={busy} aria-label={`Delete ${jersey.name}`} className={buttonDangerClass}
              onClick={() => void remove(jersey.id)}>✕</button>
          </li>
        ))}
        {(jerseys ?? []).length === 0 && jerseys !== null && (
          <li className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-xs font-semibold text-zinc-500 admin-dark:border-zinc-700">
            No jerseys yet.
          </li>
        )}
      </ul>

      {notice && <p role="status" className={noticeClass(notice)}>{notice.text}</p>}
    </section>
  );
}
