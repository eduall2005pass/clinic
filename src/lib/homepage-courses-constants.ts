export type HomepageCourseSlug = "ssc" | "hsc" | "medical";

export type HomepageCourseCard = {
  slug: HomepageCourseSlug;
  title: string;
  description: string;
  imageUrl: string | null;
  imageFileName: string | null;
  buttonText: string;
  buttonHref: string;
  isActive: boolean;
  sortOrder: number;
  updatedAt: string | null;
  updatedBy: string | null;
};

export const HOMEPAGE_COURSE_SLUGS: HomepageCourseSlug[] = ["ssc", "hsc", "medical"];

export const HOMEPAGE_COURSE_DEFAULTS: Record<HomepageCourseSlug, HomepageCourseCard> = {
  ssc: {
    slug: "ssc",
    title: "SSC Academic Courses",
    description: "Complete preparation for SSC students with structured lessons and exams.",
    imageUrl: null,
    imageFileName: null,
    buttonText: "Explore Courses",
    buttonHref: "/courses?category=ssc",
    isActive: true,
    sortOrder: 1,
    updatedAt: null,
    updatedBy: null,
  },
  hsc: {
    slug: "hsc",
    title: "HSC Academic Courses",
    description: "HSC focused courses covering all subjects with expert guidance.",
    imageUrl: null,
    imageFileName: null,
    buttonText: "Explore Courses",
    buttonHref: "/courses?category=hsc",
    isActive: true,
    sortOrder: 2,
    updatedAt: null,
    updatedBy: null,
  },
  medical: {
    slug: "medical",
    title: "Medical Admission Courses",
    description: "Dedicated medical admission preparation with model tests and mentorship.",
    imageUrl: null,
    imageFileName: null,
    buttonText: "Explore Courses",
    buttonHref: "/courses?category=medical",
    isActive: true,
    sortOrder: 3,
    updatedAt: null,
    updatedBy: null,
  },
};

export const HOMEPAGE_COURSES_STORAGE_DIR = "homepage-courses";

export const MAX_HOMEPAGE_COURSE_IMAGE_SIZE = 5 * 1024 * 1024;

export const ALLOWED_HOMEPAGE_COURSE_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".svg",
] as const;

export const HOMEPAGE_COURSE_FALLBACK_IMAGES: Record<HomepageCourseSlug, string> = {
  ssc: "/assets/images/placeholder-ssc.svg",
  hsc: "/assets/images/placeholder-hsc.svg",
  medical: "/assets/images/placeholder-medical.svg",
};
