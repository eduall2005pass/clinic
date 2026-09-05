"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

export default function FavouriteToggle({
  itemType,
  itemId,
  initial = false,
  compact = false,
  onToggle,
}: {
  itemType: "class" | "material" | "exam" | "qa";
  itemId: string;
  initial?: boolean;
  compact?: boolean;
  onToggle?: (next: boolean) => void;
}) {
  const { user } = useAuth();
  const [isFavourite, setIsFavourite] = useState(initial);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    if (!user || busy) return;
    setBusy(true);
    const previous = isFavourite;
    setIsFavourite(!previous);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/my/favourites", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ itemType, itemId }),
      });
      if (!res.ok) throw new Error("failed");
      const data = (await res.json()) as { isFavourite?: boolean };
      const next = data.isFavourite === true;
      setIsFavourite(next);
      onToggle?.(next);
    } catch {
      setIsFavourite(previous);
    } finally {
      setBusy(false);
    }
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => void toggle()}
        disabled={busy}
        aria-pressed={isFavourite}
        aria-label={isFavourite ? "Remove from favourites" : "Add to favourites"}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition active:scale-95 disabled:opacity-60 ${
          isFavourite
            ? "border-amber-500/40 bg-amber-500/15 text-amber-400"
            : "border-ink/10 bg-ink/5 text-neutral-500 hover:border-amber-500/40 hover:text-amber-400"
        }`}
      >
        <svg viewBox="0 0 24 24" fill={isFavourite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.5a.56.56 0 011.04 0l2.13 5.11 5.52.44c.5.04.7.66.32.98l-4.2 3.6 1.28 5.38a.56.56 0 01-.84.61L12 16.7l-4.73 2.92a.56.56 0 01-.84-.61l1.28-5.38-4.2-3.6a.56.56 0 01.32-.98l5.52-.44 2.13-5.11z" />
        </svg>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={busy}
      aria-pressed={isFavourite}
      className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition active:scale-[0.98] disabled:opacity-60 ${
        isFavourite
          ? "border-amber-500/40 bg-amber-500/15 text-amber-400"
          : "border-ink/15 bg-ink/5 text-neutral-300 hover:border-amber-500/40 hover:text-amber-400"
      }`}
    >
      <svg viewBox="0 0 24 24" fill={isFavourite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.5a.56.56 0 011.04 0l2.13 5.11 5.52.44c.5.04.7.66.32.98l-4.2 3.6 1.28 5.38a.56.56 0 01-.84.61L12 16.7l-4.73 2.92a.56.56 0 01-.84-.61l1.28-5.38-4.2-3.6a.56.56 0 01.32-.98l5.52-.44 2.13-5.11z" />
      </svg>
      {isFavourite ? "Saved" : "Save"}
    </button>
  );
}
