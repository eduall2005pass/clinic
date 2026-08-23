"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  currentPushState,
  disablePushNotifications,
  enablePushNotifications,
  isPushSupported,
  type PushPermissionState,
} from "@/lib/push";

/** Dashboard toggle that subscribes/unsubscribes the browser for push. */
export default function PushOptIn() {
  const { user, authLoading } = useAuth();
  const [state, setState] = useState<PushPermissionState>("default");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setState(currentPushState());
  }, []);

  async function handleToggle() {
    if (!user) return;
    setBusy(true);
    setMessage(null);
    try {
      const token = await user.getIdToken();
      const headers = { Authorization: `Bearer ${token}` };
      if (state === "granted") {
        const ok = await disablePushNotifications(headers);
        setMessage(
          ok
            ? "Push notifications turned off for this device."
            : "Could not turn off notifications — try again.",
        );
        if (ok) setState("default");
      } else {
        const result = await enablePushNotifications(headers);
        if (result.ok) {
          setState("granted");
          setMessage("Push notifications enabled on this device.");
        } else {
          setMessage(result.error);
          if (result.error.includes("not granted")) setState("denied");
        }
      }
    } finally {
      setBusy(false);
    }
  }

  if (!isPushSupported() || authLoading || !user) return null;

  return (
    <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-dark-900 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-white">Push Notifications</h3>
          <p className="mt-0.5 text-xs text-zinc-400">
            Get exam and course updates instantly, even when the site is closed.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleToggle()}
          disabled={busy}
          className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
            state === "granted"
              ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
              : "bg-primary-600 text-white hover:bg-primary-700"
          }`}
        >
          {busy ? "…" : state === "granted" ? "On" : state === "denied" ? "Blocked" : "Enable"}
        </button>
      </div>
      {state === "denied" && (
        <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
          Notifications are blocked in your browser settings. Allow them for this site to subscribe.
        </p>
      )}
      {message && (
        <p role="status" className="mt-2 text-xs font-semibold text-zinc-300">
          {message}
        </p>
      )}
    </div>
  );
}
