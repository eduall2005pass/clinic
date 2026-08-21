export type WebsiteSettings = {
  siteName: string;
  tagline: string;
  contactEmail: string;
  contactPhone: string;
  facebookUrl: string;
  youtubeUrl: string;
  faviconUrl: string | null;
  faviconFileName: string | null;
  faviconUpdatedAt: number | null;
  updatedAt: number | null;
  updatedBy: string | null;
};

export const DEFAULT_WEBSITE_SETTINGS: WebsiteSettings = {
  siteName: "MediSpark",
  tagline:
    "HSC academic & medical admission preparation platform built for future medical students.",
  contactEmail: "support@medispark.com",
  contactPhone: "",
  facebookUrl: "",
  youtubeUrl: "",
  faviconUrl: null,
  faviconFileName: null,
  faviconUpdatedAt: null,
  updatedAt: null,
  updatedBy: null,
};

export const MAX_FAVICON_FILE_SIZE = 5 * 1024 * 1024;

export const ALLOWED_FAVICON_EXTENSIONS = [
  ".ico",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".svg",
] as const;

export const WEBSITE_SETTINGS_ID = "active";
export const FAVICON_STORAGE_DIR = "website/favicon";
