"use client";

import { useCallback, useEffect, useState } from "react";
import { AccessLoading, AccessMessage } from "@/components/auth/AccessGuard";
import { useAdminGate, cardClass, inputClass } from "@/components/admin/admin-ui";

type MediaItem = {
  id: string;
  fileName: string;
  directory: string;
  mimeType: string;
  size: number;
  url: string;
  createdAt: string;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MediaLibraryPage() {
  const gate = useAdminGate();
  const [media, setMedia] = useState<MediaItem[] | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/media", { cache: "no-store", headers: gate.headers });
      const data = (await response.json()) as { media?: MediaItem[] };
      setMedia(data.media ?? []);
    } catch {
      setMedia([]);
    }
  }, [gate.headers]);

  useEffect(() => {
    if (gate.ready) void Promise.resolve().then(load);
  }, [gate.ready, load]);

  if (!gate.ready) {
    return gate.denied ? (
      <AccessMessage title="Administrators only" message="Restricted to authorized administrators." actionLabel="Back to Admin Home" actionHref="/admin" />
    ) : (
      <AccessLoading label="Loading media library…" />
    );
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this file permanently?")) return;
    await fetch("/api/admin/media", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", ...gate.headers },
      body: JSON.stringify({ id }),
    });
    await load();
  }

  function copyUrl(url: string) {
    void navigator.clipboard?.writeText(url);
  }

  const filtered = (media ?? []).filter((item) =>
    item.fileName.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <header>
        <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 admin-dark:text-zinc-50">Media Library</h2>
        <p className="mt-1.5 text-sm text-zinc-500 admin-dark:text-zinc-400">
          All uploaded files live in MySQL and are served via /api/files/[id].
        </p>
      </header>

      <input type="search" value={search} onChange={(event) => setSearch(event.target.value)}
        placeholder="Search files…" aria-label="Search files" className={`${inputClass} mt-5`} />

      {media === null ? (
        <p className={`${cardClass} mt-5 p-6 text-center text-sm text-zinc-500`}>Loading…</p>
      ) : filtered.length === 0 ? (
        <p className={`${cardClass} mt-5 p-8 text-center text-sm text-zinc-500`}>No files found.</p>
      ) : (
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {filtered.map((item) => (
            <li key={item.id} className={`${cardClass} overflow-hidden`}>
              {item.mimeType.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.url} alt={item.fileName} className="h-28 w-full bg-neutral-100 object-cover admin-dark:bg-zinc-800" />
              ) : (
                <div className="flex h-28 items-center justify-center bg-neutral-100 text-xs font-bold text-zinc-400 admin-dark:bg-zinc-800">
                  {item.mimeType.split("/")[1]?.toUpperCase() || "FILE"}
                </div>
              )}
              <div className="p-3">
                <p className="truncate text-xs font-bold text-zinc-900 admin-dark:text-zinc-100">{item.fileName}</p>
                <p className="text-[10px] text-zinc-400">{formatBytes(item.size)} · {new Date(item.createdAt).toLocaleDateString()}</p>
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={() => copyUrl(item.url)}
                    className="rounded-lg border border-neutral-200 px-2 py-1 text-[10px] font-extrabold uppercase text-zinc-500 transition hover:border-primary-500/60 hover:text-primary-600 admin-dark:border-zinc-700">
                    Copy URL
                  </button>
                  <button type="button" onClick={() => void remove(item.id)}
                    className="rounded-lg border border-neutral-200 px-2 py-1 text-[10px] font-extrabold uppercase text-red-500 transition hover:border-red-500/60 admin-dark:border-zinc-700">
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
