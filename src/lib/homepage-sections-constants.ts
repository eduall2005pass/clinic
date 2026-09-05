export type HomepageSectionKey =
  | "banner"
  | "hero"
  | "homepage-courses"
  | "featured-courses"
  | "why-medispark"
  | "our-success"
  | "jersey"
  | "mentors"
  | "reviews"
  | "faq"
  | "join-with-us";

export type HomepageSection = {
  key: HomepageSectionKey;
  label: string;
  title: string | null;
  description: string | null;
  isActive: boolean;
};

export type HomepageSectionConfig = {
  key: HomepageSectionKey;
  label: string;
  defaultTitle: string;
  defaultDescription: string;
  editableText: boolean;
};

export const HOMEPAGE_SECTIONS_CONFIG: HomepageSectionConfig[] = [
  {
    key: "banner",
    label: "Banner Slider",
    defaultTitle: "",
    defaultDescription: "",
    editableText: false,
  },
  {
    key: "hero",
    label: "Hero Section",
    defaultTitle: "",
    defaultDescription: "",
    editableText: false,
  },
  {
    key: "homepage-courses",
    label: "Courses Section",
    defaultTitle: "Explore Our Courses",
    defaultDescription:
      "Choose your track — SSC, HSC or Medical Admission. Every course is built for your next achievement.",
    editableText: true,
  },
  {
    key: "featured-courses",
    label: "Featured Courses",
    defaultTitle: "Start with a featured course",
    defaultDescription:
      "Two popular courses to begin your preparation — more will be added step by step.",
    editableText: true,
  },
  {
    key: "why-medispark",
    label: "Why MediSpark",
    defaultTitle: "Learn smarter with MediSpark",
    defaultDescription:
      "One platform for your HSC academics and medical admission journey.",
    editableText: true,
  },
  {
    key: "our-success",
    label: "Our Success",
    defaultTitle: "Milestones that drive us forward",
    defaultDescription:
      "A snapshot of what we have achieved together on the road to medical admission.",
    editableText: true,
  },
  {
    key: "jersey",
    label: "Jersey Gallery",
    defaultTitle: "Jersey of MediSpark",
    defaultDescription:
      "Wear the spirit of MediSpark — our premium jersey, designed for champions.",
    editableText: true,
  },
  {
    key: "mentors",
    label: "Mentors",
    defaultTitle: "Learn from experienced mentors",
    defaultDescription:
      "Mentor profiles will grow as the platform expands.",
    editableText: true,
  },
  {
    key: "reviews",
    label: "Student Reviews",
    defaultTitle: "What students say",
    defaultDescription:
      "Real reviews from MediSpark students, verified and published after approval.",
    editableText: true,
  },
  {
    key: "faq",
    label: "FAQ",
    defaultTitle: "Frequently asked questions",
    defaultDescription:
      "Quick answers to the most common questions about MediSpark.",
    editableText: true,
  },
  {
    key: "join-with-us",
    label: "Join With Us Now !!",
    defaultTitle: "Join With Us Now !!",
    defaultDescription:
      "Connect with MediSpark on your favourite platforms and never miss an update.",
    editableText: true,
  },
];

export function getSectionConfig(
  key: HomepageSectionKey,
): HomepageSectionConfig {
  return (
    HOMEPAGE_SECTIONS_CONFIG.find((section) => section.key === key) ??
    HOMEPAGE_SECTIONS_CONFIG[0]
  );
}

export const DEFAULT_HOMEPAGE_ORDER: HomepageSectionKey[] =
  HOMEPAGE_SECTIONS_CONFIG.map((section) => section.key);

export function isValidHomepageSectionKey(key: string): boolean {
  return HOMEPAGE_SECTIONS_CONFIG.some((section) => section.key === key);
}
