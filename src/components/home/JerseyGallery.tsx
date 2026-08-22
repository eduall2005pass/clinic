"use client";

import { useEffect, useState } from "react";
import SectionHeader from "@/components/SectionHeader";
import type { JerseyItem } from "@/lib/content-admin";

export default function JerseyGallery({
  jerseys,
  title,
  description,
}: {
  jerseys: JerseyItem[];
  title?: string;
  description?: string;
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    if (!lightboxOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setLightboxOpen(false);
    }
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [lightboxOpen]);

  // Nothing published yet — the section stays hidden.
  if (!jerseys || jerseys.length === 0) return null;

  const jersey = jerseys[0];
  const hasLink = Boolean(jersey.link);

  return (
    <section
      id="jerseys"
      className="relative scroll-mt-24 overflow-hidden border-t border-ink/5 bg-dark-950"
    >
      <div className="pointer-events-none absolute left-1/2 top-24 h-80 w-80 -translate-x-1/2 rounded-full bg-primary-600/10 blur-3xl" />
      <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <SectionHeader
          label="Premium Jersey"
          title={title ?? "Jersey of MediSpark"}
          description={description ?? "Wear the spirit of MediSpark — our premium jersey, designed for champions."}
        />

        <div className="mx-auto mt-12 max-w-xl">
          <div className="group rounded-3xl border border-ink/10 bg-dark-900 p-6 text-left shadow-lg shadow-black/20 transition duration-300 hover:border-primary-600/60 hover:shadow-primary-900/30 sm:p-8">
            {jersey.image && (
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                aria-label={`View the ${jersey.name} in larger size`}
                className="block w-full cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                <span className="flex aspect-[4/5] items-center justify-center rounded-2xl bg-gradient-to-b from-dark-850 to-dark-950 p-4 transition duration-300 group-hover:bg-primary-950/40 sm:aspect-[5/4] sm:p-8">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={jersey.image}
                    alt={jersey.name}
                    className="h-full w-full object-contain drop-shadow-[0_20px_40px_rgba(229,9,20,0.3)]"
                  />
                </span>
              </button>
            )}
            <div className="mt-6 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-heading sm:text-xl">
                  {jersey.name}
                </h3>
                {jersey.note && (
                  <p className="mt-1 text-sm leading-relaxed text-neutral-400">
                    {jersey.note}
                  </p>
                )}
              </div>
              {jersey.price > 0 && (
                <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-primary-600/40 bg-primary-600/10 px-3.5 py-1.5 text-xs font-semibold text-primary-400 sm:inline-flex">
                  ৳ {jersey.price.toLocaleString("en-IN")}
                </span>
              )}
            </div>
            {hasLink && (
              <a
                href={jersey.link ?? "#"}
                target={jersey.link?.startsWith("/") ? undefined : "_blank"}
                rel="noopener noreferrer"
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-sm font-bold text-white transition duration-300 hover:bg-primary-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                Order Now
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  viewBox="0 0 24 24"
                >
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </a>
            )}
          </div>
        </div>
      </div>

      {lightboxOpen && jersey.image && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${jersey.name} large view`}
          onClick={() => setLightboxOpen(false)}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm sm:p-8"
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close jersey view"
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full border border-ink/10 bg-dark-900/80 text-heading transition hover:border-primary-600/60 hover:text-primary-400"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              viewBox="0 0 24 24"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>

          <figure
            onClick={(event) => event.stopPropagation()}
            className="flex max-h-full max-w-3xl flex-col items-center"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={jersey.image}
              alt={jersey.name}
              className="max-h-[78vh] w-auto max-w-full rounded-2xl border border-ink/10 bg-dark-900 object-contain p-6 shadow-2xl shadow-primary-900/20 sm:p-10"
            />
            <figcaption className="mt-4 text-center">
              <span className="font-bold text-heading">{jersey.name}</span>
              {jersey.note && (
                <span className="mt-1 block text-sm text-neutral-400">
                  {jersey.note}
                </span>
              )}
            </figcaption>
          </figure>
        </div>
      )}
    </section>
  );
}
