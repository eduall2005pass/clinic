"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { auth } from "@/lib/firebase";

/**
 * Press & Hold admin control — wraps any website element. When an authorized
 * admin presses and holds the element (~550ms), a small contextual menu with
 * Edit / Remove appears. Invisible to normal users and never rendered until
 * triggered, so the Main Website design stays untouched.
 */

type HoldMenuState = { x: number; y: number } | null;

export default function AdminHold({
  children,
  isAdmin,
  editHref,
  onEdit,
  removeKind,
  removeId,
  label = "item",
}: {
  children: ReactNode;
  isAdmin: boolean;
  /** Edit opens this manager route… */
  editHref?: string;
  /** …or runs this callback instead. */
  onEdit?: () => void;
  /** Supported backend remove actions. */
  removeKind?: "homepage-section" | "mentor" | "dashboard-card";
  removeId?: string;
  label?: string;
}) {
  const [menu, setMenu] = useState<HoldMenuState>(null);
  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const originRef = useRef({ x: 0, y: 0 });
  const rootRef = useRef<HTMLDivElement>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!menu && !confirming) return;
    const close = () => {
      setMenu(null);
      setConfirming(false);
    };
    window.addEventListener("click", close);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("resize", close);
    };
  }, [menu, confirming]);

  if (!isAdmin) return <>{children}</>;

  const HOLD_MS = 550;

  function startHold(event: React.PointerEvent) {
    if (!isAdmin || event.button === 2) return;
    originRef.current = { x: event.clientX, y: event.clientY };
    clearTimer();
    timerRef.current = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(30);
      const rect = rootRef.current?.getBoundingClientRect();
      setMenu({
        x: Math.min(
          event.clientX - (rect?.left ?? 0),
          (rect?.width ?? 300) - 150,
        ),
        y: event.clientY - (rect?.top ?? 0) + 8,
      });
    }, HOLD_MS);
  }

  function cancelHold(event: React.PointerEvent) {
    const moved =
      Math.abs(event.clientX - originRef.current.x) > 10 ||
      Math.abs(event.clientY - originRef.current.y) > 10;
    if (moved) clearTimer();
  }

  async function handleRemove() {
    if (!removeKind || !removeId) return;
    if (
      !window.confirm(
        `Remove "${label}" from the website? You will be asked to confirm before it is deleted.`,
      )
    ) {
      return;
    }
    setConfirming(false);
    setRemoving(true);
    try {
      if (removeKind === "homepage-section") {
        // Hide the section: fetch current list, flip isActive off, save back.
        const listRes = await fetch("/api/homepage-sections", { cache: "no-store" });
        const listData = (await listRes.json()) as {
          sections?: Array<{ key: string; title?: string; description?: string; isActive?: boolean }>;
        };
        const sections = (listData.sections ?? []).map((section) =>
          section.key === removeId ? { ...section, isActive: false } : section,
        );
        await fetch("/api/homepage-sections", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await auth?.currentUser?.getIdToken() ?? ""}`,
          },
          body: JSON.stringify({ sections }),
        });
      } else if (removeKind === "dashboard-card") {
        // Hide the dashboard card for every student (reversible via
        // Dashboard Control → manage).
        await fetch("/api/admin/dashboard-cards", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await auth?.currentUser?.getIdToken() ?? ""}`,
          },
          body: JSON.stringify({ key: removeId, isActive: false }),
        });
      } else if (removeKind === "mentor") {
        await fetch("/api/mentors", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await auth?.currentUser?.getIdToken() ?? ""}`,
          },
          body: JSON.stringify({ id: removeId }),
        });
      }
      window.location.reload();
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <div
        onPointerDown={startHold}
        onPointerUp={clearTimer}
        onPointerLeave={clearTimer}
        onPointerMove={cancelHold}
        onContextMenu={(event) => {
          if (isAdmin) event.preventDefault();
        }}
      >
        {children}
      </div>

      {menu && (
        <div
          role="menu"
          className="absolute z-50 w-40 overflow-hidden rounded-xl border border-primary-500/40 bg-[#f1f5f9] admin-dark:bg-[#0a162e] shadow-2xl shadow-black/60"
          style={{ left: Math.max(menu.x, 4), top: menu.y }}
          onClick={(event) => event.stopPropagation()}
        >
          <p className="border-b border-ink/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
            {label} · Admin
          </p>
          {onEdit || editHref ? (
            onEdit ? (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenu(null);
                  onEdit();
                }}
                className="block w-full px-3 py-2 text-left text-xs font-bold text-heading transition hover:bg-primary-600/15 hover:text-primary-300"
              >
                ✎ Edit
              </button>
            ) : (
              <Link
                href={editHref ?? "#"}
                role="menuitem"
                onClick={() => setMenu(null)}
                className="block w-full px-3 py-2 text-left text-xs font-bold text-heading transition hover:bg-primary-600/15 hover:text-primary-300"
              >
                ✎ Edit
              </Link>
            )
          ) : null}
          {removeKind && removeId ? (
            removing ? (
              <p className="px-3 py-2 text-xs font-bold text-neutral-500">Removing…</p>
            ) : (
              <button
                type="button"
                role="menuitem"
                onClick={() => setConfirming(true)}
                className="block w-full px-3 py-2 text-left text-xs font-bold text-red-400 transition hover:bg-red-500/15"
              >
                🗑 Remove
              </button>
            )
          ) : null}
        </div>
      )}

      {confirming && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm">
          <div className="max-w-sm rounded-2xl border border-red-500/30 bg-white admin-dark:bg-[#112544] p-6 text-center shadow-2xl">
            <p className="font-bold text-heading">Remove “{label}”?</p>
            <p className="mt-2 text-sm leading-relaxed text-neutral-400">
              This will be removed from MySQL and disappear from the Main
              Website immediately.
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="rounded-xl border border-ink/15 bg-ink/5 px-4 py-2.5 text-sm font-semibold text-heading transition hover:bg-ink/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleRemove()}
                disabled={removing}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {removing ? "Removing…" : "Yes, Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Client-side admin check — controls render ONLY for authorized admins. */
export function useIsAdmin(): boolean {
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const unsub = auth?.onAuthStateChanged((user) => {
      if (!user) {
        setIsAdmin(false);
        return;
      }
      void (async () => {
        try {
          const res = await fetch("/api/admin", {
            headers: { Authorization: `Bearer ${await user.getIdToken()}` },
            cache: "no-store",
          });
          if (!cancelled) setIsAdmin(res.ok);
        } catch {
          if (!cancelled) setIsAdmin(false);
        }
      })();
    });
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, []);
  return isAdmin;
}
