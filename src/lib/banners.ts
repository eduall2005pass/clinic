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
