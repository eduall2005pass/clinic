"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { useIsAdmin } from "./AdminHold";
import AdminToastProvider, { useAdminToast } from "./AdminToastProvider";

/**
 * Hero section text editor — lets an admin edit the Main Heading Line 1,
 * Main Heading Line 2 and the Hero Description right from Home Control.
 *
 * Line 1 and Line 2 are stored inside the existing single `hero_settings.headline`
 * field separated by a newline, so no schema change is needed and the buttons,
 * background and animations stay untouched.
 */
export default function HeroTextEditor() {
  const isAdmin = useIsAdmin();
  const router = useRouter();
  const toast = useAdminToast();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [description, setDescription] = useState("");

  async function openEditor() {
    setOpen(true);
    setLoading(true);
    try {
      const token = await auth?.currentUser?.getIdToken();
      const res = await fetch("/api/hero", {
        cache: "no-store",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const data = (await res.json()) as {
        hero?: { headline?: string; description?: string };
      };
      const headline = data.hero?.headline ?? "";
      const parts = headline.split("\n");
      setLine1(parts[0] ?? "");
      setLine2(parts.slice(1).join("\n").trim());
      setDescription(data.hero?.description ?? "");
    } catch {
      toast.showToast("error", "হিরো টেক্সট লোড করা যায়নি।");
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!auth?.currentUser) return;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("headline", `${line1.trim()}\n${line2.trim()}`);
      formData.append("description", description.trim());
      const token = await auth.currentUser.getIdToken();
      const res = await fetch("/api/hero", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.showToast("error", data.error ?? "সংরক্ষণ ব্যর্থ হয়েছে।");
        return;
      }
      setOpen(false);
      toast.showToast("success", "হিরো টেক্সট সেভ হয়েছে—লাইভ ওয়েবসাইটে আপডেট হয়েছে।");
      router.refresh();
    } catch {
      toast.showToast("error", "সংরক্ষণ ব্যর্থ হয়েছে।");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "mt-1 w-full rounded-xl border border-neutral-200 bg-[#f8fbff] px-3 py-2 text-sm text-[#0b1e3a] outline-none transition placeholder:text-slate-400 focus:border-[#2f6bce]/60 focus:bg-white admin-dark:border-[#1e3a65] admin-dark:bg-[#0f2547] admin-dark:text-zinc-100 disabled:opacity-60";

  return (
    <AdminToastProvider>
      {isAdmin && (
        <button
          type="button"
          onClick={() => void openEditor()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-primary-500/60 bg-primary-600/10 px-4 py-2 text-xs font-bold text-primary-300 transition hover:bg-primary-600/20 active:scale-[0.98]"
        >
          ✎ Edit Text
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-[#1e3a65] bg-white p-6 shadow-2xl admin-dark:bg-[#112544]">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold tracking-tight text-[#0b1e3a] admin-dark:text-white">
                Hero Text <span className="text-primary-500">|</span> সম্পাদনা
              </h3>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                disabled={saving}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-zinc-500 transition hover:border-red-500/40 hover:text-red-500 admin-dark:border-[#1e3a65] admin-dark:text-zinc-300"
              >
                ✕
              </button>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-500 admin-dark:text-slate-400">
              Main Heading ও Description সম্পাদনা করুন। বাটন, ব্যাকগ্রাউন্ড ও
              অ্যানিমেশন অপরিবর্তিত থাকবে।
            </p>

            <div className="mt-5 grid gap-4">
              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Main Heading Line 1
                </span>
                <input
                  type="text"
                  value={line1}
                  maxLength={250}
                  placeholder="Learn Smarter. Prepare Better."
                  disabled={loading}
                  onChange={(event) => setLine1(event.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Main Heading Line 2
                </span>
                <input
                  type="text"
                  value={line2}
                  maxLength={250}
                  placeholder="Achieve Your Dream."
                  disabled={loading}
                  onChange={(event) => setLine2(event.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Hero Description (বাংলা)
                </span>
                <textarea
                  value={description}
                  rows={4}
                  disabled={loading}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="পড়াশোনা হোক আরও সহজ…"
                  className={inputClass}
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={saving}
                className="rounded-xl border border-neutral-200 px-5 py-2.5 text-sm font-semibold text-zinc-600 transition hover:bg-neutral-50 disabled:opacity-50 admin-dark:border-[#1e3a65] admin-dark:text-zinc-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving || loading}
                className="rounded-xl bg-primary-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary-900/30 transition hover:bg-primary-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminToastProvider>
  );
}
