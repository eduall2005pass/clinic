"use client";

import { useEffect, useState } from "react";
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

type Settings = {
  allowedEmailDomains: string[];
  maxLoginAttempts: number;
  sessionTimeoutMinutes: number;
  requireStrongPassword: boolean;
  blockSuspiciousIps: boolean;
};

export default function SecurityPage() {
  const gate = useAdminGate();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [domainsText, setDomainsText] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    if (!gate.ready) return;
    fetch("/api/admin/security-settings", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { settings?: Settings }) => {
        const loaded = data.settings;
        if (loaded) {
          setSettings(loaded);
          setDomainsText(loaded.allowedEmailDomains.join(", "));
        }
      })
      .catch(() => undefined);
  }, [gate.ready]);

  if (!gate.ready || !settings) {
    return gate.denied ? (
      <AccessMessage title="Administrators only" message="Restricted to authorized administrators." actionLabel="Back to Admin Home" actionHref="/admin" />
    ) : (
      <AccessLoading label="Loading security settings…" />
    );
  }

  async function save() {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/security-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...gate.headers },
        body: JSON.stringify({
          ...settings,
          allowedEmailDomains: domainsText
            .split(",")
            .map((item) => item.trim().toLowerCase())
            .filter(Boolean),
        }),
      });
      if (!response.ok) {
        setNotice({ kind: "error", text: "Failed to save." });
        return;
      }
      setNotice({ kind: "success", text: "Security settings saved." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <header>
        <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 admin-dark:text-zinc-50">Security</h2>
        <p className="mt-1.5 text-sm text-zinc-500 admin-dark:text-zinc-400">
          Sign-in policy settings for the admin panel.
        </p>
      </header>

      <div className={`${cardClass} mt-5 space-y-5 p-5`}>
        <div>
          <label className={labelClass} htmlFor="sec-domains">Allowed email domains (comma separated, empty = any)</label>
          <input id="sec-domains" className={inputClass} placeholder="gmail.com, medispark.com"
            value={domainsText} onChange={(event) => setDomainsText(event.target.value)} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="sec-attempts">Max login attempts</label>
            <input id="sec-attempts" type="number" min="1" className={inputClass} value={settings.maxLoginAttempts}
              onChange={(event) => setSettings({ ...settings, maxLoginAttempts: Number(event.target.value) || 5 })} />
          </div>
          <div>
            <label className={labelClass} htmlFor="sec-timeout">Session timeout (minutes)</label>
            <input id="sec-timeout" type="number" min="5" className={inputClass} value={settings.sessionTimeoutMinutes}
              onChange={(event) => setSettings({ ...settings, sessionTimeoutMinutes: Number(event.target.value) || 120 })} />
          </div>
        </div>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm font-semibold text-zinc-700 admin-dark:text-zinc-200">
            <input type="checkbox" className="h-4 w-4 accent-primary-600" checked={settings.requireStrongPassword}
              onChange={(event) => setSettings({ ...settings, requireStrongPassword: event.target.checked })} />
            Require strong passwords
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-zinc-700 admin-dark:text-zinc-200">
            <input type="checkbox" className="h-4 w-4 accent-primary-600" checked={settings.blockSuspiciousIps}
              onChange={(event) => setSettings({ ...settings, blockSuspiciousIps: event.target.checked })} />
            Block suspicious IPs
          </label>
        </div>
        <button type="button" onClick={() => void save()} disabled={busy} className={buttonPrimaryClass}>
          {busy ? "Saving…" : "Save Security Settings"}
        </button>
      </div>

      {notice && <p role="status" className={noticeClass(notice)}>{notice.text}</p>}
    </section>
  );
}
