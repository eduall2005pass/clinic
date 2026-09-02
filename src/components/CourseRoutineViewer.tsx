"use client";

import { useState } from "react";

type Props = {
  routineUrls?: string[] | null;
  courseName?: string;
};

function isPdf(url: string): boolean {
  return /\.pdf(\?|$)/i.test(url);
}
function isImage(url: string): boolean {
  return /\.(png|jpe?g|webp|gif|svg|avif|ico)(\?|$)/i.test(url);
}

export default function CourseRoutineViewer({ routineUrls, courseName }: Props) {
  const urls = (routineUrls ?? []).filter(Boolean);
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [zoom, setZoom] = useState(1);

  const hasRoutine = urls.length > 0;
  const currentUrl = hasRoutine ? urls[Math.min(page, urls.length - 1)] : null;
  const isSinglePdf = urls.length === 1 && currentUrl ? isPdf(currentUrl) : false;
  const isMulti = urls.length > 1;

  function zoomIn() {
    setZoom((z) => Math.min(3, Math.round((z + 0.25) * 100) / 100));
  }
  function zoomOut() {
    setZoom((z) => Math.max(0.5, Math.round((z - 0.25) * 100) / 100));
  }
  function resetZoom() {
    setZoom(1);
  }

  if (!hasRoutine) {
    return (
      <section className="mt-8 rounded-2xl border border-ink/10 bg-dark-900 p-6 shadow-lg shadow-black/20">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-heading">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-600/15 text-primary-400">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path d="M8 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6" />
                <path d="M10 13H8" />
                <path d="M16 17H8" />
                <path d="M13 13h3" />
              </svg>
            </span>
            Course Routine
          </h2>
          <span className="rounded-full bg-ink/10 px-3 py-1 text-xs font-bold text-neutral-400">Not Available</span>
        </div>
        <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-ink/15 bg-dark-950/50 px-6 py-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ink/10 text-neutral-500">
            <svg className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
              <path d="M10 13H8" />
              <path d="M16 17H8" />
            </svg>
          </div>
          <p className="mt-4 text-sm font-bold text-heading">Routine Not Available</p>
          <p className="mt-1 max-w-sm text-xs leading-relaxed text-neutral-500">
            The routine for{courseName ? ` “${courseName}”` : " this course"} hasn&apos;t been uploaded yet. Please check back later.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-8 rounded-2xl border border-ink/10 bg-dark-900 p-6 shadow-lg shadow-black/20">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 text-lg font-extrabold text-heading">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-600/15 text-primary-400">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path d="M8 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
              <path d="M10 13H8" />
              <path d="M16 17H8" />
              <path d="M13 13h3" />
            </svg>
          </span>
          Course Routine
          {isMulti && (
            <span className="rounded-full bg-primary-600/15 px-2.5 py-0.5 text-xs font-bold text-primary-400">
              {urls.length} pages
            </span>
          )}
          {isSinglePdf && (
            <span className="rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-bold text-red-400">PDF</span>
          )}
        </h2>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={`rounded-xl px-5 py-2.5 text-sm font-bold shadow-md transition active:scale-[0.98] ${
            open
              ? "border border-ink/15 bg-ink/10 text-heading hover:bg-ink/20"
              : "bg-primary-600 text-white shadow-primary-900/20 hover:bg-primary-700"
          }`}
          aria-expanded={open}
        >
          {open ? "Hide Routine" : "View Routine"}
        </button>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-neutral-500">
        {isMulti
          ? "Multi-page routine — navigate pages and zoom for a clear view on mobile or desktop."
          : isSinglePdf
            ? "PDF routine — scroll, zoom, or open in a new tab."
            : "Image routine — zoom in for a detailed view, works well on mobile and desktop."}
      </p>

      {open && (
        <div className="mt-5 space-y-4">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink/10 bg-dark-950 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={zoomOut}
                disabled={zoom <= 0.5}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink/15 bg-dark-900 text-sm font-bold text-heading transition hover:bg-ink/10 disabled:opacity-40"
                aria-label="Zoom out"
                title="Zoom out"
              >
                −
              </button>
              <span className="min-w-[3.5rem] text-center text-xs font-bold text-heading">{Math.round(zoom * 100)}%</span>
              <button
                type="button"
                onClick={zoomIn}
                disabled={zoom >= 3}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink/15 bg-dark-900 text-sm font-bold text-heading transition hover:bg-ink/10 disabled:opacity-40"
                aria-label="Zoom in"
                title="Zoom in"
              >
                +
              </button>
              <button
                type="button"
                onClick={resetZoom}
                className="rounded-lg border border-ink/15 bg-dark-900 px-3 py-1.5 text-xs font-bold text-heading transition hover:bg-ink/10"
              >
                Reset
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isMulti && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setPage((p) => Math.max(0, p - 1));
                    }}
                    disabled={page === 0}
                    className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-primary-700 disabled:opacity-40"
                  >
                    ← Prev
                  </button>
                  <span className="rounded-lg border border-ink/10 bg-dark-900 px-3 py-1.5 text-xs font-bold text-heading">
                    {page + 1} / {urls.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setPage((p) => Math.min(urls.length - 1, p + 1));
                    }}
                    disabled={page >= urls.length - 1}
                    className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-primary-700 disabled:opacity-40"
                  >
                    Next →
                  </button>
                </div>
              )}
              {currentUrl && (
                <a
                  href={currentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-ink/15 bg-dark-900 px-3 py-1.5 text-xs font-bold text-heading transition hover:bg-ink/10"
                >
                  Open ↗
                </a>
              )}
            </div>
          </div>

          {/* Multi-page thumbnails */}
          {isMulti && (
            <div className="flex gap-2 overflow-x-auto rounded-xl border border-ink/10 bg-dark-950 p-2">
              {urls.map((u, idx) => (
                <button
                  key={u + idx}
                  type="button"
                  onClick={() => {
                    setPage(idx);
                  }}
                  className={`relative shrink-0 overflow-hidden rounded-lg border-2 transition ${
                    idx === page ? "border-primary-500" : "border-transparent hover:border-ink/20"
                  }`}
                  aria-label={`Go to page ${idx + 1}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {isPdf(u) ? (
                    <span className="flex h-16 w-16 items-center justify-center bg-red-500/10 text-[10px] font-bold text-red-400">
                      PDF {idx + 1}
                    </span>
                  ) : (
                    <img src={u} alt={`Page ${idx + 1}`} className="h-16 w-16 object-cover" />
                  )}
                  <span
                    className={`absolute bottom-0.5 right-0.5 rounded px-1 py-0.5 text-[9px] font-bold ${
                      idx === page ? "bg-primary-600 text-white" : "bg-black/60 text-white"
                    }`}
                  >
                    {idx + 1}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Viewer */}
          <div className="overflow-auto rounded-xl border border-ink/10 bg-dark-950 p-2 sm:p-3">
            <div
              className="mx-auto origin-top transition-transform duration-200"
              style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}
            >
              {currentUrl ? (
                isPdf(currentUrl) ? (
                  <div className="overflow-hidden rounded-lg border border-ink/10 bg-white">
                    <object data={currentUrl} type="application/pdf" className="h-[70vh] w-full min-h-[420px]">
                      <iframe
                        src={currentUrl}
                        title="Routine PDF"
                        className="h-[70vh] w-full min-h-[420px] border-0"
                      />
                    </object>
                    <div className="border-t border-ink/10 bg-white px-3 py-2 text-center">
                      <a
                        href={currentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-primary-600 hover:text-primary-700"
                      >
                        Can&apos;t see the PDF? Open in new tab →
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={currentUrl}
                      alt={`Routine page ${page + 1}`}
                      className="max-w-full rounded-lg object-contain"
                      style={{ maxHeight: "75vh" }}
                    />
                  </div>
                )
              ) : null}
            </div>
          </div>

          {/* Scroll hint for multi-page */}
          {isMulti && urls.length > 1 && (
            <p className="text-center text-xs text-neutral-500">
              Tip: Use Prev/Next or tap thumbnails to navigate • Zoom and scroll to read clearly on mobile.
            </p>
          )}
          {/* Vertical scroll list alternative for easy reading */}
          {isMulti && urls.every((u) => !isPdf(u)) && (
            <details className="rounded-xl border border-ink/10 bg-dark-950">
              <summary className="cursor-pointer list-none px-4 py-3 text-xs font-bold text-heading hover:text-primary-400">
                Show all pages vertically (scroll) ▾
              </summary>
              <div className="space-y-3 p-3">
                {urls.map((u, idx) => (
                  <div key={u + idx} className="overflow-hidden rounded-lg border border-ink/10 bg-white">
                    <div className="bg-ink/5 px-3 py-1.5 text-xs font-bold text-neutral-600">Page {idx + 1}</div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={u} alt={`Routine page ${idx + 1}`} className="w-full object-contain" />
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </section>
  );
}
