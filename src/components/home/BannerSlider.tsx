"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { bannerSlides } from "@/lib/banners";

const AUTO_SLIDE_MS = 3000;
const SWIPE_THRESHOLD_PX = 50;

export default function BannerSlider() {
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((index) => (index + 1) % bannerSlides.length);
    }, AUTO_SLIDE_MS);
    return () => clearInterval(timer);
  }, []);

  const goTo = (index: number) => {
    setActiveIndex((index + bannerSlides.length) % bannerSlides.length);
  };

  return (
    <section className="relative bg-dark-950">
      <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6 sm:pt-6">
        <div
          role="region"
          aria-label="Featured banners"
          className="relative touch-pan-y overflow-hidden rounded-2xl border border-ink/10 bg-dark-900 shadow-lg shadow-black/30"
          onTouchStart={(event) => {
            touchStartX.current = event.touches[0].clientX;
          }}
          onTouchEnd={(event) => {
            if (touchStartX.current === null) return;
            const deltaX = event.changedTouches[0].clientX - touchStartX.current;
            touchStartX.current = null;
            if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) return;
            goTo(activeIndex + (deltaX < 0 ? 1 : -1));
          }}
        >
          <div
            className="flex transition-transform duration-700 ease-out"
            style={{ transform: `translateX(-${activeIndex * 100}%)` }}
          >
            {bannerSlides.map((slide) => (
              <div
                key={slide.id}
                className="relative h-44 w-full shrink-0 overflow-hidden sm:h-60 md:h-72"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-dark-900 via-dark-900/85 to-primary-950/40" />
                <div className="absolute inset-0 bg-grid-lines opacity-30" />
                {slide.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={slide.image}
                    alt=""
                    className="absolute inset-y-0 right-0 hidden h-full w-1/2 object-contain opacity-40 sm:block"
                  />
                )}

                <div className="relative z-10 flex h-full flex-col justify-center px-6 sm:px-10">
                  {slide.title && (
                    <h2 className="max-w-md text-xl font-extrabold leading-tight tracking-tight text-heading sm:text-2xl md:text-3xl">
                      {slide.title}
                    </h2>
                  )}
                  {slide.subtitle && (
                    <p className="mt-2 max-w-md text-sm leading-relaxed text-neutral-400 sm:text-base">
                      {slide.subtitle}
                    </p>
                  )}
                  {slide.buttonLabel && slide.href && (
                    <Link
                      href={slide.href}
                      className="mt-4 inline-flex w-fit items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-900/40 transition hover:bg-primary-700 active:scale-[0.98]"
                    >
                      {slide.buttonLabel}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5">
            {bannerSlides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                aria-label={`Go to slide ${index + 1}`}
                aria-current={index === activeIndex}
                onClick={() => goTo(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === activeIndex
                    ? "w-5 bg-primary-500"
                    : "w-2 bg-ink/30 hover:bg-ink/50"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}