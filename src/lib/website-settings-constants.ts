export type FooterLink = {
  label: string;
  href: string;
};

export type WebsiteSettings = {
  siteName: string;
  tagline: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  facebookUrl: string;
  youtubeUrl: string;
  otherContactLinks: FooterLink[] | null;
  faviconUrl: string | null;
  faviconFileName: string | null;
  faviconUpdatedAt: number | null;
  updatedAt: number | null;
  updatedBy: string | null;
  copyrightText: string | null;
  footerLinks: FooterLink[] | null;
  showExplore: boolean;
  showPrograms: boolean;
  showContact: boolean;
};

export const DEFAULT_WEBSITE_SETTINGS: WebsiteSettings = {
  siteName: "MediSpark",
  tagline:
    "HSC academic & medical admission preparation platform built for future medical students.",
  contactEmail: "support@medispark.com",
  contactPhone: "",
  address: "",
  facebookUrl: "",
  youtubeUrl: "",
  otherContactLinks: null,
  faviconUrl: null,
  faviconFileName: null,
  faviconUpdatedAt: null,
  updatedAt: null,
  updatedBy: null,
  copyrightText: null,
  footerLinks: null,
  showExplore: true,
  showPrograms: true,
  showContact: true,
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
