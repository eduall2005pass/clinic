// Client-safe hero constants & types (no server-only imports).

export const MAX_HERO_IMAGE_FILE_SIZE = 5 * 1024 * 1024;

export const ALLOWED_HERO_IMAGE_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".svg",
] as const;

export type HeroSettings = {
  headline: string;
  description: string;
  buttonText: string;
  buttonLink: string;
  isActive: boolean;
  backgroundImageUrl: string | null;
  backgroundFileName: string | null;
  updatedAt: number | null;
  updatedBy: string | null;
};

export const DEFAULT_HERO_SETTINGS: HeroSettings = {
  headline: "Learn Smarter. Prepare Better.\nAchieve Your Dream.",
  description:
    "পড়াশোনা হোক আরও সহজ, প্রস্তুতি হোক আরও স্মার্ট। এইচএসসি একাডেমিক ও মেডিকেল অ্যাডমিশনের জন্য কোর্স, পরীক্ষা ও এক্সপার্ট সাপোর্ট—সবকিছু এখন এক জায়গায়।",
  buttonText: "Explore Courses",
  buttonLink: "/courses",
  isActive: true,
  backgroundImageUrl: null,
  backgroundFileName: null,
  updatedAt: null,
  updatedBy: null,
};
