"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import SectionHeader from "@/components/SectionHeader";
import { jerseys } from "@/lib/jerseys";

export default function JerseyGallery() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const scrollToIndex = useCallback((index: number) => {
    const track = trackRef.current;
    if (!track) return;
    const cards = Array.from(track.children) as HTMLElement[];
    const card = cards[index];
    if (!card) return;
    track.scrollTo({
      left: card.offsetLeft - (track.clientWidth - card.offsetWidth) / 2,
      behavior: "smooth",
    });
  }, []);

  useEffect(() => {
    if (lightboxIndex === null) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setLightboxIndex(null);
      } else if (event.key === "ArrowRight") {
        setLightboxIndex((index) =>
          index === null ? index : (index + 1) % jerseys.length,
        );
      } else if (event.key === "ArrowLeft") {
        setLightboxIndex((index) =>
          index === null ? index : (index - 1 + jerseys.length) % jerseys.length,
        );
      }
    }
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [lightboxIndex]);

  if (jerseys.length === 0) return null;

  return (
    <section
      id="jerseys"
      className="relative scroll-mt-24 overflow-hidden border-t border-ink/5 bg-dark-950"
    >
      <div className="pointer-events-none absolute -right-32 top-24 h-72 w-72 rounded-full bg-primary-600/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 bottom-16 h-56 w-56 rounded-full bg-primary-900/10 blur-3xl" />
      <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <SectionHeader
          label="Jersey প্রদর্শনী"
          title="MediSpark Premium Jerseys"
          description="Wear the spirit of MediSpark — swipe through our premium jersey collection."
        />

        <div className="relative mt-12">
          <div
            ref={trackRef}
            onScroll={(event) => {
              const track = event.currentTarget;
              const cards = Array.from(track.children) as HTMLElement[];
              let nearest = 0;
              let bestDistance = Infinity;
              cards.forEach((card, index) => {
                const distance = Math.abs(card.offsetLeft - track.scrollLeft);
                if (distance < bestDistance) {
                  bestDistance = distance;
                  nearest = index;
                }
              });
              setActiveIndex(nearest);
            }}
            className="no-scrollbar relative flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pb-2"
          >
            {jerseys.map((jersey, index) => (
              <article
                key={jersey.id}
                className="group w-60 shrink-0 snap-start sm:w-72"
              >
                <button
                  type="button"
                  onClick={() => setLightboxIndex(index)}
                  aria-label={`View ${jersey.name} jersey in larger size`}
                  className="block w-full cursor-zoom-in rounded-2xl border border-ink/10 bg-dark-900 p-5 text-left shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-primary-600/60 hover:shadow-primary-900/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                >
                  <div className="flex aspect-[4/5] items-center justify-center rounded-xl bg-gradient-to-b from-dark-850 to-dark-950 p-3 transition duration-300 group-hover:from-primary-950/40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={jersey.image}
                      alt={jersey.name}
                      loading="lazy"
                      className="h-full w-full object-contain drop-shadow-[0_12px_24px_rgba(229,9,20,0.25)]"
                    />
                  </div>
                  <h3 className="mt-4 font-bold text-heading">{jersey.name}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-neutral-400">
                    {jersey.note}
                  </p>
                </button>
              </article>
            ))}
          </div>

          <button
            type="button"
            onClick={() => scrollToIndex(Math.max(0, activeIndex - 1))}
            aria-label="Scroll to previous jersey"
            className="absolute left-0 top-[38%] hidden -translate-x-1/2 items-center justify-center rounded-full border border-ink/10 bg-dark-900/90 p-3 text-heading shadow-lg shadow-black/30 backdrop-blur transition hover:border-primary-600/60 hover:text-primary-400 md:flex"
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
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() =>
              scrollToIndex(Math.min(jerseys.length - 1, activeIndex + 1))
            }
            aria-label="Scroll to next jersey"
            className="absolute right-0 top-[38%] hidden translate-x-1/2 items-center justify-center rounded-full border border-ink/10 bg-dark-900/90 p-3 text-heading shadow-lg shadow-black/30 backdrop-blur transition hover:border-primary-600/60 hover:text-primary-400 md:flex"
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
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        </div>

        <div className="mt-8 flex items-center justify-center gap-1.5">
          {jerseys.map((jersey, index) => (
            <button
              key={jersey.id}
              type="button"
              aria-label={`Go to jersey ${index + 1}`}
              aria-current={index === activeIndex}
              onClick={() => scrollToIndex(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === activeIndex
                  ? "w-5 bg-primary-500"
                  : "w-2 bg-ink/30 hover:bg-ink/50"
              }`}
            />
          ))}
        </div>
      </div>

      {lightboxIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${jerseys[lightboxIndex].name} jersey large view`}
          onClick={() => setLightboxIndex(null)}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm sm:p-8"
        >
          <button
            type="button"
            onClick={() => setLightboxIndex(null)}
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

          {jerseys.length > 1 && (
            <>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setLightboxIndex(
                    (lightboxIndex - 1 + jerseys.length) % jerseys.length,
                  );
                }}
                aria-label="Previous jersey"
                className="absolute left-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-ink/10 bg-dark-900/80 text-heading transition hover:border-primary-600/60 hover:text-primary-400 sm:left-6"
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
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setLightboxIndex((lightboxIndex + 1) % jerseys.length);
                }}
                aria-label="Next jersey"
                className="absolute right-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-ink/10 bg-dark-900/80 text-heading transition hover:border-primary-600/60 hover:text-primary-400 sm:right-6"
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
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </button>
            </>
          )}

          <figure
            onClick={(event) => event.stopPropagation()}
            className="flex max-h-full max-w-4xl flex-col items-center"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={jerseys[lightboxIndex].image}
              alt={jerseys[lightboxIndex].name}
              className="max-h-[78vh] w-auto max-w-full rounded-2xl border border-ink/10 bg-dark-900 object-contain p-6 shadow-2xl shadow-primary-900/20 sm:p-10"
            />
            <figcaption className="mt-4 text-center">
              <span className="font-bold text-heading">
                {jerseys[lightboxIndex].name}
              </span>
              <span className="mt-1 block text-sm text-neutral-400">
                {jerseys[lightboxIndex].note}
              </span>
            </figcaption>
          </figure>
        </div>
      )}
    </section>
  );
}