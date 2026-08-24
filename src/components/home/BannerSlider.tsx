"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { bannerSlides } from "@/lib/banners";
import type { CustomBanner } from "@/lib/banner-store";

type Slide = {
  id: string;
  image: string;
  href?: string;
  alt?: string;
};

const AUTO_SLIDE_MS = 3000;
const SWIPE_THRESHOLD_PX = 40;

export default function BannerSlider() {
  const [activeIndex, setActiveIndex] = useState(0);
  // Slides come only from Admin → Banners (MySQL). Defaults are shown only
  // while the API is unreachable; an empty banner list renders nothing.
  const [slides, setSlides] = useState<Slide[]>([]);
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchSwiped = useRef(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/banners", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("banners unavailable");
        return response.json();
      })
      .then((data: { slides?: CustomBanner[] | null } | null) => {
        if (cancelled) return;
        const custom = data?.slides ?? [];
        // Database is the single source of truth for the slider.
        setSlides(
          custom.map((slide) => ({
            id: slide.id,
            image: slide.url,
            href: slide.href ?? undefined,
            alt: slide.title ?? undefined,
          })),
        );
      })
      .catch(() => {
        // API unreachable → keep the built-in banners as a graceful fallback.
        if (!cancelled) setSlides(bannerSlides);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const goTo = useCallback((index: number) => {
    setActiveIndex((index + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (paused || slides.length === 0) return;
    const timer = setInterval(() => {
      goTo(activeIndex + 1);
    }, AUTO_SLIDE_MS);
    return () => clearInterval(timer);
  }, [paused, activeIndex, goTo, slides.length]);

  // Loading — keep layout height stable without flashing stale content.
  if (!ready && slides.length === 0) {
    return (
      <section
        role="region"
        aria-label="Featured banners"
        className="relative w-full overflow-hidden bg-dark-950"
      >
        <div className="aspect-[8/3] w-full animate-pulse bg-dark-900 sm:aspect-[16/5]" />
      </section>
    );
  }

  // Admin disabled/deleted every banner — nothing to show.
  if (slides.length === 0) return null;

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
        {slides.map((slide) => {
          const banner = (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={slide.image}
              alt={slide.alt ?? ""}
              draggable={false}
              className="h-full w-full object-cover"
            />
          );
          const hashTarget = slide.href?.startsWith("#")
            ? slide.href.slice(1)
            : null;
          return (
            <div
              key={slide.id}
              className="relative aspect-[8/3] w-full shrink-0 sm:aspect-[16/5]"
            >
              {hashTarget ? (
                <a
                  href={slide.href}
                  className="block h-full w-full"
                  onClick={(event) => {
                    event.preventDefault();
                    const element = document.getElementById(hashTarget);
                    if (element) {
                      element.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      });
                    }
                  }}
                >
                  {banner}
                </a>
              ) : slide.href ? (
                <Link href={slide.href} className="block h-full w-full">
                  {banner}
                </Link>
              ) : (
                banner
              )}
            </div>
          );
        })}
      </div>

      <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2">
        {slides.map((slide, index) => (
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