export type BannerSlide = {
  id: string;
  image: string;
  href?: string;
  alt?: string;
};

export const MAX_BANNER_FILE_SIZE = 5 * 1024 * 1024;

export const ALLOWED_BANNER_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".svg",
] as const;

export const bannerSlides: BannerSlide[] = [
  {
    id: "featured-course-1",
    image: "/banners/featured-course-1.svg",
    href: "#featured-courses",
    alt: "Featured Course",
  },
  {
    id: "featured-course-2",
    image: "/banners/featured-course-2.svg",
    href: "#featured-courses",
    alt: "Featured Course",
  },
  {
    id: "public-exam",
    image: "/banners/public-exam.svg",
    href: "/exam",
    alt: "MediSpark Public Exam",
  },
  {
    id: "jersey-of-medispark",
    image: "/banners/jersey-of-medispark.svg",
    href: "#jerseys",
    alt: "Jersey of MediSpark",
  },
];