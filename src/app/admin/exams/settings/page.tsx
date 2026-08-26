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
  defaultDurationMinutes: number;
  negativeMarks: number;
  allowReview: boolean;
  showAnswersAfterSubmit: boolean;
  maxAttempts: number;
};

const DEFAULTS: Settings = {
  defaultDurationMinutes: 30,
  negativeMarks: 0.25,
  allowReview: true,
  showAnswersAfterSubmit: false,
  maxAttempts: 1,
};

export default function ExamSettingsPage() {
  const gate = useAdminGate();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    if (!gate.ready) return;
    fetch("/api/admin/exams/settings", { cache: "no-store", headers: gate.headers })
      .then((response) => response.json())
      .then((data: { settings?: Settings }) => setSettings(data.settings ?? DEFAULTS))
      .catch(() => setSettings(DEFAULTS));
  }, [gate.ready]);

  if (!gate.ready || !settings) {
    return gate.denied ? (
      <AccessMessage title="Administrators only" message="Restricted to authorized administrators." actionLabel="Back to Admin Home" actionHref="/admin" />
    ) : (
      <AccessLoading label="Loading settings…" />
    );
  }

  async function save() {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/exams/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...gate.headers },
        body: JSON.stringify(settings),
      });
      if (!response.ok) {
        setNotice({ kind: "error", text: "Failed to save settings." });
        return;
      }
      setNotice({ kind: "success", text: "Exam settings saved." });
    } finally {
      setBusy(false);
    }
  }

  function update(patch: Partial<Settings>) {
    setSettings((prev) => ({ ...(prev ?? DEFAULTS), ...patch }));
  }

  return (
    <section className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <header>
        <h2 className="text-2xl font-extrabold tracking-tight text-[#0b1e3a] admin-dark:text-white">Exam Settings</h2>
        <p className="mt-1.5 text-sm text-slate-500 admin-dark:text-slate-400">Defaults applied to new exams.</p>
      </header>

      <div className={`${cardClass} mt-5 space-y-5 p-5`}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className={labelClass} htmlFor="es-duration">Default duration (min)</label>
            <input id="es-duration" type="number" min="1" className={inputClass}
              value={settings.defaultDurationMinutes}
              onChange={(event) => update({ defaultDurationMinutes: Number(event.target.value) || 30 })} />
          </div>
          <div>
            <label className={labelClass} htmlFor="es-negative">Negative marks</label>
            <input id="es-negative" type="number" step="0.25" min="0" className={inputClass}
              value={settings.negativeMarks}
              onChange={(event) => update({ negativeMarks: Number(event.target.value) || 0 })} />
          </div>
          <div>
            <label className={labelClass} htmlFor="es-attempts">Max attempts</label>
            <input id="es-attempts" type="number" min="1" className={inputClass}
              value={settings.maxAttempts}
              onChange={(event) => update({ maxAttempts: Number(event.target.value) || 1 })} />
          </div>
        </div>

        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 admin-dark:text-zinc-200">
            <input type="checkbox" className="h-4 w-4 accent-primary-600" checked={settings.allowReview}
              onChange={(event) => update({ allowReview: event.target.checked })} />
            Allow answer review during exam
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 admin-dark:text-zinc-200">
            <input type="checkbox" className="h-4 w-4 accent-primary-600" checked={settings.showAnswersAfterSubmit}
              onChange={(event) => update({ showAnswersAfterSubmit: event.target.checked })} />
            Show correct answers after submit
          </label>
        </div>

        <button type="button" onClick={() => void save()} disabled={busy} className={buttonPrimaryClass}>
          {busy ? "Saving…" : "Save Settings"}
        </button>
      </div>

      {notice && <p role="status" className={noticeClass(notice)}>{notice.text}</p>}
    </section>
  );
}
