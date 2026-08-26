export type SocialPlatformKey = "facebook" | "youtube" | "telegram";

export type SocialLink = {
  key: SocialPlatformKey;
  label: string;
  url: string | null;
  isActive: boolean;
};

export const SOCIAL_PLATFORMS: Array<{
  key: SocialPlatformKey;
  label: string;
}> = [
  { key: "facebook", label: "Facebook" },
  { key: "youtube", label: "YouTube" },
  { key: "telegram", label: "Telegram" },
];

export function isSocialPlatformKey(key: string): key is SocialPlatformKey {
  return SOCIAL_PLATFORMS.some((platform) => platform.key === key);
}

export function getSocialLabel(key: SocialPlatformKey): string {
  return SOCIAL_PLATFORMS.find((platform) => platform.key === key)?.label ?? key;
}

export function isValidSocialUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
