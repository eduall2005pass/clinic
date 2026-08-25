/** Recognizable brand icons for the supported social platforms. */
export const SOCIAL_PLATFORM_ICONS: Record<string, string> = {
  facebook:
    "M13.5 21v-7h2.4l.36-2.8H13.5V9.4c0-.81.22-1.36 1.39-1.36h1.48V5.55c-.26-.03-1.14-.11-2.16-.11-2.14 0-3.61 1.3-3.61 3.7v2.06H8.2V14h2.4v7h2.9z",
  youtube:
    "M21.6 7.2a2.5 2.5 0 00-1.76-1.77C18.28 5 12 5 12 5s-6.28 0-7.84.43A2.5 2.5 0 002.4 7.2 26 26 0 002 12a26 26 0 00.4 4.8 2.5 2.5 0 001.76 1.77C5.72 19 12 19 12 19s6.28 0 7.84-.43a2.5 2.5 0 001.76-1.77A26 26 0 0022 12a26 26 0 00-.4-4.8zM10 15V9l5.2 3L10 15z",
  telegram:
    "M20.66 4.42L2.94 11.29c-1.22.49-1.21 1.17-.22 1.47l4.55 1.42 1.68 5.15c.2.56.1.78.68.78.45 0 .65-.2.9-.45l2.17-2.11 4.51 3.33c.83.46 1.43.22 1.63-.77l2.96-13.95c.3-1.21-.46-1.75-1.24-1.74zM8.1 13.91l9.92-6.26c.49-.3.93-.14.57.16l-8.5 7.68-.33 3.58-1.66-5.16z",
};

export function getSocialPlatformIcon(key: string): string | null {
  return SOCIAL_PLATFORM_ICONS[key] ?? null;
}
