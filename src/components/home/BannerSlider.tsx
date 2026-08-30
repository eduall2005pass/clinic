"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

type Slide = {
  id: string;
  image: string;
  href?: string;
  alt?: string;
  title?: string;
  subtitle?: string;
};

type FeaturedSlideResponse = {
  slides?:
    | {
        id: string;
        image: string;
        href: string;
        title: string;
        subtitle: string;
      }[]
    | null;
};

const AUTO_SLIDE_MS = 3000;
const SWIPE_THRESHOLD_PX = 40;

export default function BannerSlider() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchSwiped = useRef(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/featured-slides", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: FeaturedSlideResponse | null) => {
        if (cancelled || !data?.slides) return;
        setSlides(
          data.slides.map((slide) => ({
            id: slide.id,
            image: slide.image,
            href: slide.href,
            title: slide.title,
            subtitle: slide.subtitle,
          })),
        );
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const goTo = useCallback(
    (index: number) => {
      setActiveIndex((index + slides.length) % slides.length);
    },
    [slides.length],
  );

  useEffect(() => {
    if (paused || slides.length === 0) return;
    const timer = setInterval(() => {
      goTo(activeIndex + 1);
    }, AUTO_SLIDE_MS);
    return () => clearInterval(timer);
  }, [paused, activeIndex, goTo, slides.length]);

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
              alt={slide.alt ?? slide.title ?? ""}
              draggable={false}
              className="h-full w-full object-cover"
            />
          );
          const hashTarget = slide.href?.startsWith("#")
            ? slide.href.slice(1)
            : null;
          const overlay =
            slide.title || slide.subtitle ? (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pb-9 pt-10 sm:p-6 sm:pb-10 sm:pt-14">
                {slide.title && (
                  <p className="truncate text-base font-extrabold text-white drop-shadow sm:text-xl">
                    {slide.title}
                  </p>
                )}
                {slide.subtitle && (
                  <p className="mt-0.5 truncate text-xs font-semibold text-primary-300 sm:text-sm">
                    {slide.subtitle}
                  </p>
                )}
              </div>
            ) : null;
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
              {overlay}
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
