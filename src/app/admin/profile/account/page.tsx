"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AccessLoading, AccessMessage } from "@/components/auth/AccessGuard";
import {
  useAdminGate,
  noticeClass,
  cardClass,
  inputClass,
  labelClass,
  buttonPrimaryClass,
  type Notice,
} from "@/components/admin/admin-ui";

type Profile = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoUrl: string | null;
  phoneNumber: string | null;
};

export default function AccountPage() {
  const gate = useAdminGate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/profile", { cache: "no-store", headers: gate.headers });
      const data = (await response.json()) as { profile?: Profile };
      if (data.profile) {
        setProfile(data.profile);
        setDisplayName(data.profile.displayName ?? "");
        setPhoneNumber(data.profile.phoneNumber ?? "");
      }
    } catch {
      // ignore
    }
  }, [gate.headers]);

  useEffect(() => {
    if (gate.ready) void Promise.resolve().then(load);
  }, [gate.ready, load]);

  if (!gate.ready) {
    return gate.denied ? (
      <AccessMessage title="Administrators only" message="Restricted to authorized administrators." actionLabel="Back to Admin Home" actionHref="/admin" />
    ) : (
      <AccessLoading label="Loading your profile…" />
    );
  }

  async function saveDetails() {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...gate.headers },
        body: JSON.stringify({ displayName, phoneNumber }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string; profile?: Profile } | null;
      if (!response.ok) {
        setNotice({ kind: "error", text: data?.error ?? "Failed to save." });
        return;
      }
      if (data?.profile) setProfile(data.profile);
      setNotice({ kind: "success", text: "Profile saved." });
    } finally {
      setBusy(false);
    }
  }

  async function uploadPhoto(file: File) {
    setBusy(true);
    setNotice(null);
    try {
      const body = new FormData();
      body.append("photo", file);
      const response = await fetch("/api/admin/profile", {
        method: "POST",
        headers: gate.headers,
        body,
      });
      const data = (await response.json().catch(() => null)) as { error?: string; profile?: Profile } | null;
      if (!response.ok) {
        setNotice({ kind: "error", text: data?.error ?? "Photo upload failed." });
        return;
      }
      if (data?.profile) setProfile(data.profile);
      setNotice({ kind: "success", text: "Profile picture updated." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <header>
        <h2 className="text-2xl font-extrabold tracking-tight text-[#0b1e3a] admin-dark:text-white">My Account</h2>
        <p className="mt-1.5 text-sm text-slate-500 admin-dark:text-slate-400">
          Your profile details and picture. Email is managed by Google sign-in.
        </p>
      </header>

      <div className={`${cardClass} mt-5 p-5`}>
        <div className="flex items-center gap-4">
          {profile?.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.photoUrl} alt="Profile" className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-500/10 text-lg font-extrabold text-primary-600">
              {(profile?.displayName ?? profile?.email ?? "?").charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold text-[#0b1e3a] admin-dark:text-zinc-100">{profile?.displayName ?? "—"}</p>
            <p className="truncate text-xs text-slate-500">{profile?.email}</p>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-bold text-zinc-600 transition hover:border-[#93c5fd] hover:text-[#1a3a78] admin-dark:border-zinc-700 admin-dark:text-zinc-300"
          >
            Change Photo
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".png,.jpg,.jpeg,.webp"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void uploadPhoto(file);
              event.target.value = "";
            }}
          />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="pf-name">Display name</label>
            <input id="pf-name" className={inputClass} value={displayName}
              onChange={(event) => setDisplayName(event.target.value)} />
          </div>
          <div>
            <label className={labelClass} htmlFor="pf-phone">Phone number</label>
            <input id="pf-phone" className={inputClass} value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)} />
          </div>
        </div>

        <button type="button" onClick={() => void saveDetails()} disabled={busy} className={`${buttonPrimaryClass} mt-5`}>
          {busy ? "Saving…" : "Save Profile"}
        </button>
      </div>

      {notice && <p role="status" className={noticeClass(notice)}>{notice.text}</p>}
    </section>
  );
}
