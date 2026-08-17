export type LogoInfo = {
  fileName: string;
  url: string;
  width: number;
  height: number;
  updatedAt: number;
};

export const DEFAULT_LOGO: LogoInfo = {
  fileName: "default",
  url: "/assets/images/medispark-logo.png",
  width: 1536,
  height: 683,
  updatedAt: 0,
};

export const MAX_LOGO_FILE_SIZE = 5 * 1024 * 1024;

export const ALLOWED_LOGO_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".svg",
] as const;