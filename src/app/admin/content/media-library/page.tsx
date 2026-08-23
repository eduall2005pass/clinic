"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AccessLoading, AccessMessage } from "@/components/auth/AccessGuard";
import { useAdminGate, cardClass, inputClass, buttonPrimaryClass, buttonSecondaryClass } from "@/components/admin/admin-ui";

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
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [infoItem, setInfoItem] = useState<MediaItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setNotice(null);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("dir", "media-library");
        const response = await fetch("/api/uploads", {
          method: "POST",
          headers: gate.headers,
          body: formData,
        });
        const data = (await response.json().catch(() => null)) as { error?: string; url?: string } | null;
        if (!response.ok || !data?.url) {
          setNotice({ kind: "error", text: data?.error ?? `Failed to upload "${file.name}".` });
          return;
        }
      }
      setNotice({ kind: "success", text: `${files.length} file${files.length > 1 ? "s" : ""} uploaded.` });
      await load();
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this file permanently?")) return;
    const response = await fetch("/api/admin/media", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", ...gate.headers },
      body: JSON.stringify({ id }),
    });
    const data = (await response.json().catch(() => null)) as { error?: string; media?: MediaItem[] } | null;
    if (!response.ok) {
      setNotice({ kind: "error", text: data?.error ?? "Failed to delete." });
      return;
    }
    if (data?.media) setMedia(data.media);
    setNotice({ kind: "success", text: "File deleted." });
  }

  async function deleteUnused() {
    if (!window.confirm("Delete every image that is not used anywhere on the site? This cannot be undone.")) return;
    setNotice(null);
    const response = await fetch("/api/admin/media", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...gate.headers },
      body: JSON.stringify({ action: "deleteUnused" }),
    });
    const data = (await response.json().catch(() => null)) as
      | { error?: string; removed?: number; media?: MediaItem[] }
      | null;
    if (!response.ok) {
      setNotice({ kind: "error", text: data?.error ?? "Failed to clean up unused files." });
      return;
    }
    if (data?.media) setMedia(data.media);
    setNotice({
      kind: "success",
      text: `${data?.removed ?? 0} unused file${(data?.removed ?? 0) === 1 ? "" : "s"} deleted.`,
    });
  }

  function copyUrl(url: string) {
    void navigator.clipboard?.writeText(`${window.location.origin}${url}`);
    setNotice({ kind: "success", text: "Image URL copied." });
  }

  const filtered = (media ?? []).filter((item) =>
    item.fileName.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 admin-dark:text-zinc-50">Media Library</h2>
          <p className="mt-1.5 max-w-xl text-sm text-zinc-500 admin-dark:text-zinc-400">
            Centralized library for every uploaded image — upload, search,
            copy URLs, inspect file information and delete unused files.
            Files live in MySQL and are served via /api/files/[id].
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(event) => void upload(event.target.files)}
          />
          <button type="button" disabled={uploading} className={buttonPrimaryClass}
            onClick={() => fileInputRef.current?.click()}>
            {uploading ? "Uploading…" : "⬆ Upload Image"}
          </button>
          <button type="button" onClick={() => void deleteUnused()} className={buttonSecondaryClass}>
            Delete Unused
          </button>
        </div>
      </header>

      <input type="search" value={search} onChange={(event) => setSearch(event.target.value)}
        placeholder="Search by file name…" aria-label="Search files" className={`${inputClass} mt-5`} />

      {notice && (
        <p role="status"
          className={`mt-4 rounded-xl border px-4 py-3 text-sm font-semibold ${
            notice.kind === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 admin-dark:text-emerald-400"
              : "border-red-500/30 bg-red-500/10 text-red-500"
          }`}>
          {notice.text}
        </p>
      )}

      {media === null ? (
        <p className={`${cardClass} mt-5 p-6 text-center text-sm text-zinc-500`}>Loading…</p>
      ) : filtered.length === 0 ? (
        <p className={`${cardClass} mt-5 p-8 text-center text-sm text-zinc-500`}>No files found.</p>
      ) : (
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
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
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button type="button" onClick={() => copyUrl(item.url)}
                    className="rounded-lg border border-neutral-200 px-2 py-1 text-[10px] font-extrabold uppercase text-zinc-500 transition hover:border-primary-500/60 hover:text-primary-600 admin-dark:border-zinc-700">
                    Copy URL
                  </button>
                  <button type="button" onClick={() => setInfoItem(item)}
                    className="rounded-lg border border-neutral-200 px-2 py-1 text-[10px] font-extrabold uppercase text-zinc-500 transition hover:border-primary-500/60 hover:text-primary-600 admin-dark:border-zinc-700">
                    Info
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

      {/* File information dialog */}
      {infoItem && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true">
          <div className={`${cardClass} w-full max-w-md p-5 sm:p-6`}>
            <h3 className="text-base font-extrabold text-zinc-900 admin-dark:text-zinc-100">File Information</h3>
            {infoItem.mimeType.startsWith("image/") && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={infoItem.url} alt={infoItem.fileName} className="mt-3 max-h-48 w-full rounded-xl bg-neutral-100 object-contain admin-dark:bg-zinc-800" />
            )}
            <dl className="mt-4 space-y-2 text-xs">
              {[
                ["Name", infoItem.fileName],
                ["Type", infoItem.mimeType],
                ["Size", formatBytes(infoItem.size)],
                ["Directory", infoItem.directory],
                ["Uploaded", new Date(infoItem.createdAt).toLocaleString()],
                ["URL", infoItem.url],
              ].map(([label, value]) => (
                <div key={label} className="flex gap-2">
                  <dt className="w-20 shrink-0 font-bold uppercase tracking-wide text-zinc-400">{label}</dt>
                  <dd className="min-w-0 break-all text-zinc-700 admin-dark:text-zinc-300">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-5 flex gap-2">
              <button type="button" className={buttonSecondaryClass}
                onClick={() => copyUrl(infoItem.url)}>Copy URL</button>
              <a href={infoItem.url} target="_blank" rel="noopener noreferrer" className={buttonSecondaryClass + " inline-block"}>
                Open
              </a>
              <button type="button" className={buttonSecondaryClass} onClick={() => setInfoItem(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
