export type Course = {
  slug: string;
  subject: string;
  category: "HSC Academic" | "Medical Admission";
  level: string;
  duration: string;
  description: string;
};

export const courses: Course[] = [
  {
    slug: "biology",
    subject: "Biology",
    category: "HSC Academic",
    level: "HSC 1st & 2nd Year",
    duration: "12 chapters",
    description:
      "Complete HSC Biology preparation — cell biology to genetics, physiology, and plant science with exam-focused explanations.",
  },
  {
    slug: "chemistry",
    subject: "Chemistry",
    category: "HSC Academic",
    level: "HSC 1st & 2nd Year",
    duration: "12 chapters",
    description:
      "HSC Chemistry made clear — physical, inorganic, and organic chemistry fundamentals with step-by-step problem solving.",
  },
  {
    slug: "physics",
    subject: "Physics",
    category: "HSC Academic",
    level: "HSC 1st & 2nd Year",
    duration: "12 chapters",
    description:
      "Mechanics, waves, electricity, and modern physics — conceptual clarity and numerical practice for HSC success.",
  },
  {
    slug: "higher-mathematics",
    subject: "Higher Mathematics",
    category: "HSC Academic",
    level: "HSC 1st & 2nd Year",
    duration: "12 chapters",
    description:
      "Systematic higher math preparation — algebra, calculus, trigonometry, and geometry with worked examples.",
  },
  {
    slug: "english",
    subject: "English",
    category: "HSC Academic",
    level: "HSC 1st & 2nd Year",
    duration: "8 chapters",
    description:
      "Grammar, composition, and HSC board exam skills — build strong English fundamentals step by step.",
  },
  {
    slug: "medical-admission",
    subject: "Medical Admission Preparation",
    category: "Medical Admission",
    level: "Admission Candidates",
    duration: "Full syllabus",
    description:
      "Targeted preparation for medical admission — biology, chemistry, physics, and math combined with exam strategy.",
  },
];

export const categories: Course["category"][] = [
  "HSC Academic",
  "Medical Admission",
];