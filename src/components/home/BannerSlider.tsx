"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { bannerSlides } from "@/lib/banners";

const AUTO_SLIDE_MS = 3000;
const SWIPE_THRESHOLD_PX = 40;

export default function BannerSlider() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchSwiped = useRef(false);

  const goTo = useCallback((index: number) => {
    setActiveIndex((index + bannerSlides.length) % bannerSlides.length);
  }, []);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      goTo(activeIndex + 1);
    }, AUTO_SLIDE_MS);
    return () => clearInterval(timer);
  }, [paused, activeIndex, goTo]);

  return (
    <section
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured banners"
      className="relative w-full select-none overflow-hidden bg-dark-950"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0].clientX;
      }}
      onTouchEnd={(event) => {
        if (touchStartX.current === null) return;
        const deltaX = event.changedTouches[0].clientX - touchStartX.current;
        touchStartX.current = null;
        if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) return;
        touchSwiped.current = true;
        goTo(activeIndex + (deltaX < 0 ? 1 : -1));
      }}
      onClickCapture={(event) => {
        if (touchSwiped.current) {
          event.preventDefault();
          event.stopPropagation();
          touchSwiped.current = false;
        }
      }}
    >
      <div
        className="flex touch-pan-y transition-transform duration-700 ease-out"
        style={{ transform: `translateX(-${activeIndex * 100}%)` }}
      >
        {bannerSlides.map((slide) => (
          <div
            key={slide.id}
            className="relative aspect-[8/3] w-full shrink-0 sm:aspect-[16/5]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={slide.image}
              alt={slide.alt ?? ""}
              draggable={false}
              className="h-full w-full object-cover"
            />

            {(slide.title || slide.buttonLabel) && (
              <div className="absolute inset-0 flex items-center bg-gradient-to-r from-black/60 via-black/20 to-transparent">
                <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
                  {slide.title && (
                    <h2 className="max-w-md text-lg font-extrabold leading-tight tracking-tight text-white drop-shadow-md sm:text-2xl md:text-3xl">
                      {slide.title}
                    </h2>
                  )}
                  {slide.buttonLabel && slide.href && (
                    <Link
                      href={slide.href}
                      className="mt-3 inline-flex w-fit items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-black/40 transition hover:bg-primary-700 active:scale-[0.98] sm:mt-4 sm:px-5 sm:py-2.5 sm:text-sm"
                    >
                      {slide.buttonLabel}
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2">
        {bannerSlides.map((slide, index) => (
          <button
            key={slide.id}
            type="button"
            aria-label={`Go to slide ${index + 1}`}
            aria-current={index === activeIndex}
            onClick={() => goTo(index)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              index === activeIndex
                ? "w-6 bg-primary-500 shadow-[0_0_8px_rgba(229,9,20,0.8)]"
                : "w-1.5 bg-white/50 hover:bg-white/80"
            }`}
          />
        ))}
      </div>
    </section>
  );
}